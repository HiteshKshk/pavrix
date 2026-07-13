import * as cheerio from "cheerio";

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

// Keywords that indicate page types
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

// ─── PlaywrightCrawler ────────────────────────────────────────────────────────

export class PlaywrightCrawler {
  private static readonly TIMEOUT_MS = 15_000;
  private static readonly LITE_TIMEOUT_MS = 5_000;

  /**
   * Crawls a website URL.
   *
   * Strategy:
   * 1. Try fetch() first (fast, no JS). Works for ~60% of sites.
   * 2. If fetch fails or content looks empty/JS-gated, fall back to Playwright
   *    with @sparticuz/chromium-min for full rendering.
   *
   * No LLM involved — pure deterministic extraction via Cheerio.
   */
  static async crawl(url: string, brandKeywords: string[] = []): Promise<CrawlResult> {
    const crawledAt = new Date();

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Step 1: Try lightweight fetch first
    let html: string | null = null;
    try {
      html = await PlaywrightCrawler.fetchWithTimeout(normalizedUrl, PlaywrightCrawler.LITE_TIMEOUT_MS);
    } catch {
      // Will try Playwright below
    }

    // Step 2: If fetch returned empty / JS-shell, try Playwright
    if (!html || PlaywrightCrawler.isJsGated(html)) {
      try {
        html = await PlaywrightCrawler.fetchWithPlaywright(normalizedUrl);
      } catch (err) {
        console.warn(`[Crawler] Playwright failed for ${normalizedUrl}:`, err);
        // Return partial result with error flag
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
          error: `Crawl failed: ${String(err).slice(0, 100)}`,
        };
      }
    }

    // Step 3: Cheerio structured extraction
    return PlaywrightCrawler.extract(normalizedUrl, html, brandKeywords, crawledAt);
  }

  // ─── Fetch Strategies ─────────────────────────────────────────────────────

  private static async fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
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
    // Dynamic import to avoid loading heavy Playwright at module init
    // Uses @sparticuz/chromium-min for serverless compatibility
    let chromium: any;
    let playwright: any;

    try {
      chromium = await import("@sparticuz/chromium-min");
      playwright = await import("playwright-core");
    } catch {
      // Playwright not available in this environment — use fetch only
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PlaywrightCrawler.TIMEOUT_MS,
      });

      // Wait briefly for JS to settle
      await page.waitForTimeout(2000);

      return await page.content();
    } finally {
      await browser.close();
    }
  }

  // ─── Content Analysis ─────────────────────────────────────────────────────

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

    // Remove noise
    $("script, style, noscript, svg, iframe").remove();

    const fullText = $("body").text().replace(/\s+/g, " ").trim();
    const fullTextLower = fullText.toLowerCase();
    const allHrefs = $("a[href]").map((_, el) => $(el).attr("href") ?? "").get();

    // About text: prefer /about page content, fallback to meta description
    const metaDesc =
      $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "";
    const aboutText = (metaDesc || fullText).slice(0, 800);

    // Brand mentions — exact word-boundary match
    const brandMentions: string[] = [];
    for (const brand of brandKeywords) {
      const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(fullText)) {
        brandMentions.push(brand);
      }
    }

    // Product categories — heuristic from nav/header links
    const navLinks = $("nav a, header a").map((_, el) => $(el).text().trim()).get();
    const productCategories = navLinks
      .filter((t) => t.length > 2 && t.length < 40)
      .slice(0, 10);

    // Locations — look for address-like patterns and "locations" links
    const locationPatterns = [
      /\b\d{3,5}\s+[A-Za-z\s]+(St|Ave|Rd|Blvd|Dr|Ln|Way|Pl)\b/g,
      /\b[A-Z][a-zA-Z]+,\s*[A-Z]{2}\s+\d{5}\b/g,
    ];
    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const matches = fullText.match(pattern) ?? [];
      locations.push(...matches.slice(0, 5));
    }

    // Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set(fullText.match(emailRegex) ?? [])].slice(0, 5);

    // Phone
    const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
    const phones = fullText.match(phoneRegex) ?? [];
    const phone = phones[0] ?? null;

    // Social links
    const socialLinks: Record<string, string> = {};
    const allLinks = allHrefs.join(" ") + " " + fullText;
    for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
      const match = allLinks.match(regex);
      if (match) socialLinks[platform] = `https://${match[0]}`;
    }

    // Page feature detection
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

    // Store count heuristic — look for "X locations" or "X stores"
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
}
