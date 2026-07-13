export interface WeightTemplate {
  categoryFit: number;        // 0.20 — exact/adjacent category match
  geography: number;          // 0.15 — country/region match
  brandMatch: number;         // 0.20 — target brand mentioned on site
  competitorPresence: number; // 0.20 — competitor brands detected
  storeCount: number;         // 0.10 — physical store footprint
  buyingSignals: number;      // 0.10 — recency-decayed signal sum
  websiteQuality: number;     // 0.05 — wholesale page, contact, store finder
}

export interface ScoreBreakdownItem {
  raw: number;
  weight: number;
  contribution: number;
  label?: string;
}

export interface ScoringResult {
  totalScore: number;
  band: "Hot" | "Warm" | "Nurture" | "Deprioritize";
  breakdown: Record<string, ScoreBreakdownItem>;
  scoreVersion: string;
}

/** Default weights — reference baseline. Per-category templates override these. */
export const DEFAULT_WEIGHTS: WeightTemplate = {
  categoryFit: 0.20,
  geography: 0.15,
  brandMatch: 0.20,
  competitorPresence: 0.20,
  storeCount: 0.10,
  buyingSignals: 0.10,
  websiteQuality: 0.05,
};

// Category adjacency — used for partial category fit scoring
const ADJACENT_CATEGORIES: Record<string, string[]> = {
  sportswear: ["footwear", "outdoor", "fashion", "accessories"],
  footwear: ["sportswear", "outdoor", "fashion", "luxury", "accessories"],
  luxury: ["fashion", "accessories", "beauty", "footwear"],
  outdoor: ["sportswear", "footwear", "home"],
  kitchen: ["home", "accessories"],
  toys: ["home", "accessories"],
  fashion: ["luxury", "beauty", "accessories", "sportswear", "footwear"],
  beauty: ["fashion", "luxury", "accessories"],
  accessories: ["fashion", "luxury", "beauty", "footwear", "sportswear"],
  electronics: ["home"],
  home: ["kitchen", "electronics", "accessories"],
};

export class ScoringEngine {
  static readonly VERSION = "2.0.0";

  /**
   * Computes a 0–100 opportunity score for a company against a specific category template.
   *
   * IMPORTANT: This is deterministic and auditable. LLM is never involved.
   * All weights come from the category template or DEFAULT_WEIGHTS, never hardcoded.
   */
  static computeScore(
    company: {
      categoryTags: string[];
      address: string;
      country?: string | null;
      revenueBand?: string | null;
      employeeCountBand?: string | null;
      storeCount?: number | null;
      hasEcommerce: boolean;
      website?: string | null;
      phone?: string | null;
      crawlData?: {
        hasWholesalePage?: boolean;
        hasContactPage?: boolean;
        hasStoreFinder?: boolean;
        storeCount?: number | null;
        brandMentions?: string[];
      } | null;
    },
    signals: Array<{
      type: string;
      pointValue: number;
      detectedDate: Date | string;
    }>,
    categoryName: string,
    brandKeywords: string[],
    weightTemplate?: Partial<WeightTemplate>,
    websiteText?: string,
    /** Target brand name(s) to check for direct brand match */
    targetBrands?: string[]
  ): ScoringResult {
    // Merge with defaults — per-category templates override defaults
    const template: WeightTemplate = {
      ...DEFAULT_WEIGHTS,
      ...(weightTemplate as Partial<WeightTemplate>),
    };

    // Normalize weights to sum to 1.0 (safety guard for custom templates)
    const weightSum = Object.values(template).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      const factor = 1.0 / weightSum;
      for (const key of Object.keys(template) as (keyof WeightTemplate)[]) {
        template[key] = template[key] * factor;
      }
    }

    const breakdown: Record<string, ScoreBreakdownItem> = {};
    const catNameLower = categoryName.toLowerCase();
    const companyCatsLower = company.categoryTags.map((c) => c.toLowerCase());

    // ── 1. Category Fit ──────────────────────────────────────────────────────
    let categoryFitRaw = 0;
    if (companyCatsLower.includes(catNameLower)) {
      categoryFitRaw = 100;
    } else {
      const adjacents = ADJACENT_CATEGORIES[catNameLower] ?? [];
      if (companyCatsLower.some((c) => adjacents.includes(c))) {
        categoryFitRaw = 50;
      }
    }
    breakdown.categoryFit = {
      raw: categoryFitRaw,
      weight: template.categoryFit,
      contribution: categoryFitRaw * template.categoryFit,
      label: "Category Fit",
    };

    // ── 2. Geography / Country Match ─────────────────────────────────────────
    let geoRaw = 0;
    const countrySource = (company.country ?? company.address ?? "").toUpperCase();
    const primaryMarkets = [
      "US", "UK", "CA", "AU", "EU", "FR", "DE", "GB",
      "UNITED STATES", "UNITED KINGDOM", "CANADA", "AUSTRALIA",
    ];
    if (primaryMarkets.some((m) => countrySource.includes(m))) {
      geoRaw = 100;
    } else if (countrySource.trim().length > 2) {
      geoRaw = 50; // Valid but not primary market
    }
    breakdown.geography = {
      raw: geoRaw,
      weight: template.geography,
      contribution: geoRaw * template.geography,
      label: "Geography Match",
    };

    // ── 3. Brand Match ────────────────────────────────────────────────────────
    // Direct match of the searched brand on the company's website
    let brandMatchRaw = 0;
    if (targetBrands && targetBrands.length > 0) {
      const contentLower = (websiteText ?? "").toLowerCase();
      const crawlBrands = company.crawlData?.brandMentions ?? [];
      const allMentions = [...crawlBrands];

      let matched = 0;
      for (const brand of targetBrands) {
        const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(contentLower) || allMentions.some((m) => regex.test(m))) {
          matched++;
        }
      }
      if (matched >= targetBrands.length) brandMatchRaw = 100;
      else if (matched > 0) brandMatchRaw = 60;
    } else if (brandKeywords.length > 0) {
      // Fall back to category brand keywords
      const contentLower = (websiteText ?? "").toLowerCase();
      const crawlBrands = company.crawlData?.brandMentions ?? [];
      const matchedKws = brandKeywords.filter((kw) => {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        return regex.test(contentLower) || crawlBrands.some((m) => regex.test(m));
      });
      if (matchedKws.length >= 3) brandMatchRaw = 100;
      else if (matchedKws.length >= 1) brandMatchRaw = 60;
    }
    breakdown.brandMatch = {
      raw: brandMatchRaw,
      weight: template.brandMatch,
      contribution: brandMatchRaw * template.brandMatch,
      label: "Brand Match",
    };

    // ── 4. Competitor Brand Presence ──────────────────────────────────────────
    let competitorRaw = 30; // Default neutral when no data
    if ((websiteText || (company.crawlData?.brandMentions?.length ?? 0) > 0) && brandKeywords.length > 0) {
      const contentLower = (websiteText ?? "").toLowerCase();
      const crawlBrands = company.crawlData?.brandMentions ?? [];
      let matchCount = 0;
      for (const kw of brandKeywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(contentLower) || crawlBrands.some((m) => regex.test(m))) {
          matchCount++;
        }
      }
      if (matchCount >= 3) competitorRaw = 100;
      else if (matchCount >= 1) competitorRaw = 75;
      else competitorRaw = 0;
    }
    breakdown.competitorPresence = {
      raw: competitorRaw,
      weight: template.competitorPresence,
      contribution: competitorRaw * template.competitorPresence,
      label: "Competitor Brand Presence",
    };

    // ── 5. Store Count ─────────────────────────────────────────────────────────
    // Prefer crawled store count; fall back to DB-stored value
    const effectiveStoreCount =
      company.crawlData?.storeCount ?? company.storeCount ?? null;

    let storeRaw = 0;
    if (effectiveStoreCount !== null) {
      if (effectiveStoreCount >= 50) storeRaw = 100;
      else if (effectiveStoreCount >= 10) storeRaw = 80;
      else if (effectiveStoreCount >= 2) storeRaw = 50;
      else if (effectiveStoreCount === 1) storeRaw = 30;
    }
    breakdown.storeCount = {
      raw: storeRaw,
      weight: template.storeCount,
      contribution: storeRaw * template.storeCount,
      label: "Store Count",
    };

    // ── 6. Buying Signals — Recency-Decayed ────────────────────────────────────
    let totalSignalPoints = 0;
    const now = new Date();

    for (const sig of signals) {
      const sigDate = new Date(sig.detectedDate);
      const diffDays = Math.max(
        0,
        (now.getTime() - sigDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let decayFactor = 0.1;
      if (diffDays <= 30) decayFactor = 1.0;
      else if (diffDays <= 90) decayFactor = 0.7;
      else if (diffDays <= 180) decayFactor = 0.4;

      totalSignalPoints += sig.pointValue * decayFactor;
    }

    const buyingSignalsRaw = Math.min(100, totalSignalPoints);
    breakdown.buyingSignals = {
      raw: buyingSignalsRaw,
      weight: template.buyingSignals,
      contribution: buyingSignalsRaw * template.buyingSignals,
      label: "Buying Signals",
    };

    // ── 7. Website Quality ─────────────────────────────────────────────────────
    let websiteQualityRaw = 20; // Default: missing / unknown

    if (company.website) {
      let qualityScore = 50; // Has website
      if (company.phone) qualityScore += 10;
      if (company.crawlData?.hasContactPage) qualityScore += 10;
      if (company.crawlData?.hasWholesalePage) qualityScore += 20;
      if (company.crawlData?.hasStoreFinder) qualityScore += 10;
      websiteQualityRaw = Math.min(100, qualityScore);
    }

    breakdown.websiteQuality = {
      raw: websiteQualityRaw,
      weight: template.websiteQuality,
      contribution: websiteQualityRaw * template.websiteQuality,
      label: "Website Quality",
    };

    // ── Total Score ────────────────────────────────────────────────────────────
    let totalScore = 0;
    for (const item of Object.values(breakdown)) {
      totalScore += item.contribution;
    }
    totalScore = Math.round(totalScore * 10) / 10;

    // ── Band Classification ────────────────────────────────────────────────────
    let band: ScoringResult["band"] = "Deprioritize";
    if (totalScore >= 80) band = "Hot";
    else if (totalScore >= 60) band = "Warm";
    else if (totalScore >= 40) band = "Nurture";

    return {
      totalScore,
      band,
      breakdown,
      scoreVersion: ScoringEngine.VERSION,
    };
  }
}
