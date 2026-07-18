import { CrawlResult } from "./crawl/crawler";

export type SignalType =
  | "expansion"
  | "hiring"
  | "new_ecommerce"
  | "competitor_brand_sold"
  | "funding"
  | "trade_show"
  | "store_locator_present"
  | "wholesale_page"
  | "premium_segment"
  | "import_business"
  | "multiple_locations";

export interface DetectedSignal {
  type: SignalType;
  pointValue: number;
  description: string;
  matchedText?: string;
  sourceField?: string;
}

export class SignalEngine {
  /**
   * Deterministic signal detection from crawled website content.
   * Extended from MVP with structural crawl data (wholesale page, store finder, etc.)
   * No LLM involved — all regex/heuristic rules.
   */
  static detectSignals(
    websiteContent?: string | null,
    brandKeywords: string[] = [],
    crawlResult?: CrawlResult | null
  ): DetectedSignal[] {
    const signals: DetectedSignal[] = [];
    const contentLower = (websiteContent ?? "").toLowerCase();

    // ── Crawl-result structural signals (highest quality, from Playwright) ──

    if (crawlResult) {
      // 1. Wholesale page present (25 points)
      if (crawlResult.hasWholesalePage) {
        signals.push({
          type: "wholesale_page",
          pointValue: 25,
          description: "Company has a dedicated wholesale or trade account page.",
          sourceField: "Playwright HTML crawl results",
          matchedText: "wholesale page path detected",
        });
      }

      // 2. Store locator / multiple locations (20 points)
      if (crawlResult.hasStoreFinder) {
        const storeLabel = crawlResult.storeCount
          ? `${crawlResult.storeCount} locations detected`
          : "store finder page detected";
        signals.push({
          type: "store_locator_present",
          pointValue: 20,
          description: `Store locator present — ${storeLabel}.`,
          sourceField: "Playwright HTML crawl results",
          matchedText: storeLabel,
        });
      }

      // 3. Multiple locations inferred from store count (15 points)
      if (crawlResult.storeCount !== null && crawlResult.storeCount >= 2) {
        signals.push({
          type: "multiple_locations",
          pointValue: Math.min(30, crawlResult.storeCount * 3),
          description: `Multiple physical locations detected: ${crawlResult.storeCount} stores.`,
          sourceField: "Playwright store count analysis",
          matchedText: `${crawlResult.storeCount} stores count`,
        });
      }

      // 4. Brand mentions (competitor brand sold) from crawl (25 points)
      if (crawlResult.brandMentions.length > 0) {
        signals.push({
          type: "competitor_brand_sold",
          pointValue: 25,
          description: `Competing brands sold: ${crawlResult.brandMentions.slice(0, 5).join(", ")}`,
          sourceField: "Playwright brand matcher",
          matchedText: crawlResult.brandMentions.slice(0, 5).join(", "),
        });
      }
    }

    // ── Text-based signals (from any website text content) ──

    if (!websiteContent) return signals;

    // 5. New Location / Expansion (30 points)
    const expansionPatterns = [
      /opening a new/i,
      /expanding to/i,
      /new store/i,
      /now open in/i,
      /relocating/i,
      /second location/i,
      /grand opening/i,
      /additional warehouse/i,
      /new branch/i,
      /opening soon/i,
    ];
    const isExpansion = expansionPatterns.some((p) => p.test(contentLower));
    if (isExpansion) {
      const sentences = websiteContent.split(/[.!?]+/);
      const matchSentence = sentences
        .find((s) => expansionPatterns.some((p) => p.test(s)))
        ?.trim();
      signals.push({
        type: "expansion",
        pointValue: 30,
        description: matchSentence
          ? `Store expansion signal: "${matchSentence}"`
          : "Announced new location or warehouse expansion.",
        sourceField: "scraped website text",
        matchedText: matchSentence ?? "expansion match",
      });
    }

    // 6. Hiring Buyer / Purchasing roles (20 points)
    const hiringPatterns = [
      /\bhiring\b/i,
      /\bcareers\b/i,
      /\brecruiting\b/i,
      /purchasing manager/i,
      /\bbuyer\b/i,
      /procurement manager/i,
      /retail buyer/i,
      /\bmerchandiser\b/i,
      /head of buying/i,
      /buying director/i,
    ];
    const isHiring = hiringPatterns.some((p) => p.test(contentLower));
    if (isHiring) {
      const sentences = websiteContent.split(/[.!?]+/);
      const matchSentence = sentences
        .find((s) => hiringPatterns.some((p) => p.test(s)))
        ?.trim();
      signals.push({
        type: "hiring",
        pointValue: 20,
        description: matchSentence
          ? `Buyer hiring signal: "${matchSentence}"`
          : "Hiring postings for buyers or purchasing managers detected.",
        sourceField: "scraped website careers text",
        matchedText: matchSentence ?? "hiring match",
      });
    }

    // 7. Competitor Brand Sold (text-based fallback, 25 points) — only if no crawl result
    if (!crawlResult && brandKeywords.length > 0) {
      const matchedBrands: string[] = [];
      for (const brand of brandKeywords) {
        const escaped = brand.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(contentLower)) {
          matchedBrands.push(brand);
        }
      }
      if (matchedBrands.length > 0) {
        signals.push({
          type: "competitor_brand_sold",
          pointValue: 25,
          description: `Competing brands sold: ${matchedBrands.join(", ")}`,
          sourceField: "fallback scraped text search",
          matchedText: matchedBrands.join(", "),
        });
      }
    }

    // 8. E-commerce capability (20 points)
    const ecommercePatterns = [
      /shopify/i,
      /woocommerce/i,
      /add to cart/i,
      /shopping cart/i,
      /checkout/i,
      /order online/i,
      /buy now/i,
    ];
    const hasEcommerceKeywords = ecommercePatterns.some((p) => p.test(contentLower));
    if (hasEcommerceKeywords) {
      signals.push({
        type: "new_ecommerce",
        pointValue: 20,
        description: "Active e-commerce or online ordering capability detected.",
        sourceField: "scraped website body text",
        matchedText: "ecommerce keyword match",
      });
    }

    // 9. Trade show / exhibition presence (15 points)
    const tradeShowPatterns = [
      /trade show/i,
      /tradeshow/i,
      /exhibition/i,
      /trade fair/i,
      /buyers' market/i,
      /magic show/i,
      /ispo/i,
      /outdoor retailer/i,
    ];
    const hasTradeShow = tradeShowPatterns.some((p) => p.test(contentLower));
    if (hasTradeShow) {
      signals.push({
        type: "trade_show",
        pointValue: 15,
        description: "Trade show or exhibition attendance mentioned.",
        sourceField: "scraped website news/text",
        matchedText: "trade show match",
      });
    }

    // 10. Premium segment indicator (15 points)
    const premiumPatterns = [
      /luxury/i,
      /premium/i,
      /high-end/i,
      /exclusive/i,
      /curated selection/i,
      /boutique/i,
    ];
    const hasPremium = premiumPatterns.some((p) => p.test(contentLower));
    if (hasPremium) {
      signals.push({
        type: "premium_segment",
        pointValue: 15,
        description: "Premium or luxury market positioning detected.",
        sourceField: "scraped website marketing text",
        matchedText: "luxury match",
      });
    }

    // 11. Import / international buying (10 points)
    const importPatterns = [
      /import/i,
      /imported from/i,
      /international brands/i,
      /global brands/i,
      /european brands/i,
    ];
    const hasImport = importPatterns.some((p) => p.test(contentLower));
    if (hasImport) {
      signals.push({
        type: "import_business",
        pointValue: 10,
        description: "Import or international brand sourcing activity detected.",
        sourceField: "scraped website sourcing text",
        matchedText: "import match",
      });
    }

    return signals;
  }
}
