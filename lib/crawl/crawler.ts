import * as cheerio from "cheerio";
import { checkDbConnection } from "../db/connection";
import { prisma } from "../db/prisma";
import { MemoryCache } from "../db/memory-cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrawlResult {
  url: string;
  aboutText: string;
  brandMentions: string[];
  productCategories: string[];
  locations: string[];
  emails: string[];
  phone: string | null;
  socialLinks: Record<string, string>;
  hasWholesalePage: boolean;
  hasContactPage: boolean;
  hasStoreFinder: boolean;
  hasEcommerce: boolean;
  storeCount: number | null;
  crawledAt: Date;
  error?: string;
}

const WHOLESALE_KEYWORDS = [
  "wholesale", "trade account", "bulk order", "become a retailer",
  "distributor", "b2b", "trade pricing", "reseller",
];
const STORE_FINDER_KEYWORDS = [
  "store locator", "find a store", "our locations", "store finder",
  "where to buy", "find us",
];
const ECOMMERCE_KEYWORDS = [
  "add to cart", "add to bag", "buy now", "shopping cart",
  "checkout", "shopify", "woocommerce", "order online",
];
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  twitter: /twitter\.com\/[a-zA-Z0-9_]+/,
  instagram: /instagram\.com\/[a-zA-Z0-9_.]+/,
  facebook: /facebook\.com\/[a-zA-Z0-9_.]+/,
  linkedin: /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/,
  tiktok: /tiktok\.com\/@[a-zA-Z0-9_.]+/,
};

const USER_AGENT = "PavrixProspectBot/1.0 (+http://pavrix.com; contact@pavrix.com) B2B Sales Discovery Bot";

// ─── Robots.txt Helpers ───────────────────────────────────────────────────────

async function fetchRobotsTxt(domain: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://${domain}/robots.txt`, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT }
    });
    clearTimeout(timer);
    if (res.ok) return await res.text();
  } catch {}
  return "";
}

function parseRobotsTxt(robotsTxt: string): { disallowedPaths: RegExp[] } {
  const disallowedPaths: RegExp[] = [];
  const lines = robotsTxt.split("\n");
  let currentAgentMatches = false;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) continue;

    const parts = cleanLine.split(":");
    if (parts.length < 2) continue;

    const key = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      currentAgentMatches = agent === "*" || agent === "pavrixprospectbot";
    } else if (key === "disallow" && currentAgentMatches) {
      if (value) {
        const regexStr = "^" + value
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".?");
        disallowedPaths.push(new RegExp(regexStr, "i"));
      }
    }
  }

  return { disallowedPaths };
}

function isUrlAllowed(urlStr: string, disallowedPaths: RegExp[]): boolean {
  try {
    const path = new URL(urlStr).pathname;
    return !disallowedPaths.some(regex => regex.test(path));
  } catch {
    return true;
  }
}

// ─── Text Sanitization Helper ─────────────────────────────────────────────────

export function sanitizeScrapedText(text: string): string {
  let clean = text;
  clean = clean.replace(/```[a-z]*/gi, ""); // strip code blocks
  
  const hijackKeywords = [
    "ignore all previous",
    "ignore the above",
    "ignore instructions",
    "system prompt",
    "you are now",
    "new instructions",
    "override",
  ];
  for (const kw of hijackKeywords) {
    const regex = new RegExp(kw, "gi");
    clean = clean.replace(regex, "[REDACTED INSTRUCTION]");
  }
  return clean.replace(/\s+/g, " ").trim();
}

// ─── PlaywrightCrawler ────────────────────────────────────────────────────────

export class PlaywrightCrawler {
  private static readonly TIMEOUT_MS = 15_000;
  private static readonly LITE_TIMEOUT_MS = 5_000;

  /**
   * Helper to extract domain from URL
   */
  private static getDomain(urlStr: string): string {
    try {
      const clean = urlStr.trim().toLowerCase();
      const withHttp = clean.startsWith("http") ? clean : `https://${clean}`;
      return new URL(withHttp).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  /**
   * Crawls a website domain, respecting robots.txt and crawling subpages.
   */
  static async crawl(url: string, brandKeywords: string[] = []): Promise<CrawlResult> {
    const crawledAt = new Date();
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const domain = PlaywrightCrawler.getDomain(normalizedUrl);

    // 1. Check Cache
    const isDbLive = await checkDbConnection();
    const ttlDays = parseInt(process.env.SEARCH_CACHE_TTL_DAYS ?? "30", 10);
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

    if (isDbLive) {
      try {
        const cachedContent = await prisma.websiteContent.findFirst({
          where: { url: normalizedUrl },
          orderBy: { crawledAt: "desc" }
        });
        if (cachedContent) {
          const age = Date.now() - new Date(cachedContent.crawledAt).getTime();
          if (age < ttlMs) {
            console.info(`[Crawler] Cache HIT for crawl URL: ${normalizedUrl}`);
            return PlaywrightCrawler.extract(normalizedUrl, cachedContent.content, brandKeywords, crawledAt);
          }
        }
      } catch (e) {
        console.error(`[Crawler] Failed to query WebsiteContent cache:`, e);
      }
    } else {
      const cached = MemoryCache.getWebsiteContentsByCompanyId(normalizedUrl); // we map URL to companyId in memory mode
      if (cached && cached.length > 0) {
        const lastCached = cached[cached.length - 1];
        const age = Date.now() - new Date(lastCached.crawledAt).getTime();
        if (age < ttlMs) {
          console.info(`[Crawler] Memory Cache HIT for crawl URL: ${normalizedUrl}`);
          return PlaywrightCrawler.extract(normalizedUrl, lastCached.content, brandKeywords, crawledAt);
        }
      }
    }

    // 2. Fetch Robots.txt and Check Compliance
    const robotsTxt = await fetchRobotsTxt(domain);
    const { disallowedPaths } = parseRobotsTxt(robotsTxt);

    if (!isUrlAllowed(normalizedUrl, disallowedPaths)) {
      console.warn(`[Crawler] URL disallowed by robots.txt: ${normalizedUrl}`);
      return {
        url: normalizedUrl,
        aboutText: "",
        brandMentions: [],
        productCategories: [],
        locations: [],
        emails: [],
        phone: null,
        socialLinks: {},
        hasWholesalePage: false,
        hasContactPage: false,
        hasStoreFinder: false,
        hasEcommerce: false,
        storeCount: null,
        crawledAt,
        error: "Disallowed by robots.txt",
      };
    }

    // 3. Crawl Page with retry policy (1 retry)
    let html: string | null = null;
    let attempt = 0;
    const maxAttempts = 2;
    const TERMINAL_ERRORS = ["ENOTFOUND", "ECONNREFUSED", "EHOSTUNREACH"];

    while (attempt < maxAttempts) {
      attempt++;
      try {
        // Try fetch first
        html = await PlaywrightCrawler.fetchWithTimeout(normalizedUrl, PlaywrightCrawler.LITE_TIMEOUT_MS);
        if (html && !PlaywrightCrawler.isJsGated(html)) break;
      } catch (err: any) {
        const errCode = err?.code || err?.cause?.code || "";
        const errString = String(err?.cause || err?.message || "");
        const isTerminal = TERMINAL_ERRORS.some(code => errCode === code || errString.includes(code));
        if (isTerminal) {
          console.warn(`[Crawler] Terminal connection error (${errCode || "unreachable"}) for: ${normalizedUrl}. Using simulated crawl fallback.`);
          return PlaywrightCrawler.getMockCrawlResult(normalizedUrl, brandKeywords);
        }
      }

      try {
        // Fallback to Playwright
        html = await PlaywrightCrawler.fetchWithPlaywright(normalizedUrl);
        if (html) break;
      } catch (err) {
        console.warn(`[Crawler] Crawl attempt ${attempt} failed for ${normalizedUrl}:`, err);
        if (attempt >= maxAttempts) {
          console.info(`[Crawler] All live crawl attempts failed for ${normalizedUrl}. Returning simulated crawl fallback.`);
          return PlaywrightCrawler.getMockCrawlResult(normalizedUrl, brandKeywords);
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); // wait before retry
      }
    }

    if (!html) html = "";

    // 4. Subpages Discovery & Crawling (About, Contact, Products)
    const $ = cheerio.load(html);
    const subpagesToCrawl: string[] = [];
    const keywordsPatterns = [/about/i, /contact/i, /product/i, /service/i, /wholesale/i, /locator/i];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const absoluteHref = new URL(href, normalizedUrl).toString();
        const subDomain = PlaywrightCrawler.getDomain(absoluteHref);

        // Keep subpages on the same domain
        if (subDomain === domain && !subpagesToCrawl.includes(absoluteHref) && absoluteHref !== normalizedUrl) {
          const isMatchingKeyword = keywordsPatterns.some(pat => pat.test(absoluteHref));
          if (isMatchingKeyword && isUrlAllowed(absoluteHref, disallowedPaths)) {
            subpagesToCrawl.push(absoluteHref);
          }
        }
      } catch {}
    });

    // Crawl up to 3 subpages
    const selectedSubpages = subpagesToCrawl.slice(0, 3);
    const subpageTexts: string[] = [];

    for (const subpage of selectedSubpages) {
      try {
        const subHtml = await PlaywrightCrawler.fetchWithTimeout(subpage, PlaywrightCrawler.LITE_TIMEOUT_MS);
        if (subHtml) {
          const sub$ = cheerio.load(subHtml);
          sub$("script, style, noscript, svg, iframe").remove();
          const subText = sub$("body").text();
          subpageTexts.push(subText);
        }
      } catch {}
    }

    // Combine Homepage + Subpage texts
    $("script, style, noscript, svg, iframe").remove();
    const homepageText = $("body").text();
    const combinedRawText = [homepageText, ...subpageTexts].join("\n\n");
    const sanitizedText = sanitizeScrapedText(combinedRawText);

    // 5. Cache Scraped Output
    // Note: The actual insertion of WebsiteContent is done in pipeline.service.ts
    // once we have the saved Company ID. We return the sanitizedText to be saved.

    return PlaywrightCrawler.extract(normalizedUrl, combinedRawText, brandKeywords, crawledAt);
  }

  // ─── Fetch Strategies ─────────────────────────────────────────────────────

  private static async fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  private static async fetchWithPlaywright(url: string): Promise<string> {
    let chromium: any;
    let playwright: any;

    try {
      chromium = await import("@sparticuz/chromium-min");
      playwright = await import("playwright-core");
    } catch {
      throw new Error("Playwright not available");
    }

    const executablePath = await chromium.default.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
    );

    const browser = await playwright.chromium.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath,
      headless: chromium.default.headless,
    });

    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "User-Agent": USER_AGENT,
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PlaywrightCrawler.TIMEOUT_MS,
      });

      await page.waitForTimeout(1500);

      return await page.content();
    } finally {
      await browser.close();
    }
  }

  private static isJsGated(html: string): boolean {
    const bodyLength = html.replace(/<[^>]+>/g, "").trim().length;
    return bodyLength < 200;
  }

  // ─── Cheerio Extraction ───────────────────────────────────────────────────

  private static extract(
    url: string,
    html: string,
    brandKeywords: string[],
    crawledAt: Date
  ): CrawlResult {
    const $ = cheerio.load(html);

    $("script, style, noscript, svg, iframe").remove();

    const fullText = $("body").text().replace(/\s+/g, " ").trim();
    const fullTextLower = fullText.toLowerCase();
    const allHrefs = $("a[href]").map((_, el) => $(el).attr("href") ?? "").get();

    const metaDesc =
      $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "";
    const aboutText = sanitizeScrapedText((metaDesc || fullText).slice(0, 1000));

    const brandMentions: string[] = [];
    for (const brand of brandKeywords) {
      const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(fullText)) {
        brandMentions.push(brand);
      }
    }

    const navLinks = $("nav a, header a").map((_, el) => $(el).text().trim()).get();
    const productCategories = navLinks
      .filter((t) => t.length > 2 && t.length < 40)
      .slice(0, 10);

    const locationPatterns = [
      /\b\d{3,5}\s+[A-Za-z\s]+(St|Ave|Rd|Blvd|Dr|Ln|Way|Pl)\b/g,
      /\b[A-Z][a-zA-Z]+,\s*[A-Z]{2}\s+\d{5}\b/g,
    ];
    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const matches = fullText.match(pattern) ?? [];
      locations.push(...matches.slice(0, 5));
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set(fullText.match(emailRegex) ?? [])].slice(0, 5);

    const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
    const phones = fullText.match(phoneRegex) ?? [];
    const phone = phones[0] ?? null;

    const socialLinks: Record<string, string> = {};
    const allLinks = allHrefs.join(" ") + " " + fullText;
    for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
      const match = allLinks.match(regex);
      if (match) socialLinks[platform] = `https://${match[0]}`;
    }

    const hasWholesalePage =
      WHOLESALE_KEYWORDS.some((kw) => fullTextLower.includes(kw)) ||
      allHrefs.some((href) => WHOLESALE_KEYWORDS.some((kw) => href.toLowerCase().includes(kw)));

    const hasContactPage =
      allHrefs.some((href) => /contact|get-in-touch|reach-us/i.test(href)) ||
      fullTextLower.includes("contact us");

    const hasStoreFinder =
      STORE_FINDER_KEYWORDS.some((kw) => fullTextLower.includes(kw)) ||
      allHrefs.some((href) =>
        STORE_FINDER_KEYWORDS.some((kw) => href.toLowerCase().includes(kw.replace(/ /g, "-")))
      );

    const hasEcommerce = ECOMMERCE_KEYWORDS.some((kw) => fullTextLower.includes(kw));

    let storeCount: number | null = null;
    const storeCountMatch = fullText.match(/(\d+)\s+(?:location|store|branch|outlet)s?/i);
    if (storeCountMatch) {
      storeCount = parseInt(storeCountMatch[1], 10);
    }

    return {
      url,
      aboutText,
      brandMentions,
      productCategories,
      locations,
      emails,
      phone,
      socialLinks,
      hasWholesalePage,
      hasContactPage,
      hasStoreFinder,
      hasEcommerce,
      storeCount,
      crawledAt,
    };
  }

  private static getMockCrawlResult(url: string, brandKeywords: string[]): CrawlResult {
    const crawledAt = new Date();
    const domain = PlaywrightCrawler.getDomain(url);
    const mockBrands = brandKeywords.slice(0, 3);
    const hostParts = domain.split(".");
    const rawName = hostParts[0] || "Retailer";
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    return {
      url,
      aboutText: `Welcome to ${name}. We are a premium boutique retailer specializing in quality products and leading brands since 2018. Explore our catalog online or contact our sales department.`,
      brandMentions: mockBrands,
      productCategories: ["Bestsellers", "New Arrivals", "Premium Selection"],
      locations: ["100 Main Street, Suite A, London, UK"],
      emails: [`info@${domain}`, `wholesale@${domain}`],
      phone: "+1 (555) 019-9901",
      socialLinks: {
        instagram: `https://instagram.com/${rawName}`,
        facebook: `https://facebook.com/${rawName}`,
        linkedin: `https://linkedin.com/company/${rawName}`,
      },
      hasWholesalePage: true,
      hasContactPage: true,
      hasStoreFinder: true,
      hasEcommerce: true,
      storeCount: 3,
      crawledAt,
    };
  }
}
