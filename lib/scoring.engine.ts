export interface WeightTemplate {
  industryMatch: number;
  productMatch: number;
  buyingSignals: number;
  websiteCompleteness: number;
  companyInfoCompleteness: number;
  aiConfidence: number;
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

/** Centralized scoring weights configuration object. Can be tuned here in one place. */
export const DEFAULT_WEIGHTS: WeightTemplate = {
  industryMatch: 0.20,
  productMatch: 0.20,
  buyingSignals: 0.20,
  websiteCompleteness: 0.10,
  companyInfoCompleteness: 0.15,
  aiConfidence: 0.15,
};

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
  static readonly VERSION = "3.0.0";

  /**
   * Computes a 0–100 opportunity score for a company.
   * Centralized configuration, deterministic breakdown.
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
    targetBrands?: string[],
    aiConfidenceScore?: number
  ): ScoringResult {
    const template: WeightTemplate = {
      ...DEFAULT_WEIGHTS,
      ...(weightTemplate as Partial<WeightTemplate>),
    };

    // Normalize weights to sum to 1.0
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

    // 1. Industry Match
    let industryMatchRaw = 0;
    if (companyCatsLower.includes(catNameLower)) {
      industryMatchRaw = 100;
    } else {
      const adjacents = ADJACENT_CATEGORIES[catNameLower] ?? [];
      if (companyCatsLower.some((c) => adjacents.includes(c))) {
        industryMatchRaw = 50;
      }
    }
    breakdown.industryMatch = {
      raw: industryMatchRaw,
      weight: template.industryMatch,
      contribution: industryMatchRaw * template.industryMatch,
      label: "Industry Match",
    };

    // 2. Product Match (Brand match + competitor presence)
    let productMatchRaw = 0;
    const contentLower = (websiteText ?? "").toLowerCase();
    const crawlBrands = company.crawlData?.brandMentions ?? [];

    let matched = 0;
    const searchBrands = targetBrands && targetBrands.length > 0 ? targetBrands : brandKeywords;
    for (const brand of searchBrands) {
      const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(contentLower) || crawlBrands.some((m) => regex.test(m))) {
        matched++;
      }
    }
    if (matched >= 3) productMatchRaw = 100;
    else if (matched >= 1) productMatchRaw = 60;
    else productMatchRaw = 0;

    breakdown.productMatch = {
      raw: productMatchRaw,
      weight: template.productMatch,
      contribution: productMatchRaw * template.productMatch,
      label: "Product Match",
    };

    // 3. Buying Signals
    let totalSignalPoints = 0;
    const now = new Date();
    for (const sig of signals) {
      const sigDate = new Date(sig.detectedDate);
      const diffDays = Math.max(0, (now.getTime() - sigDate.getTime()) / (1000 * 60 * 60 * 24));
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

    // 4. Website Completeness (quality of contact info, store locator, wholesale indicator)
    let websiteCompletenessRaw = 20;
    if (company.website) {
      let qualityScore = 50;
      if (company.phone) qualityScore += 10;
      if (company.crawlData?.hasContactPage) qualityScore += 10;
      if (company.crawlData?.hasWholesalePage) qualityScore += 20;
      if (company.crawlData?.hasStoreFinder) qualityScore += 10;
      websiteCompletenessRaw = Math.min(100, qualityScore);
    }
    breakdown.websiteCompleteness = {
      raw: websiteCompletenessRaw,
      weight: template.websiteCompleteness,
      contribution: websiteCompletenessRaw * template.websiteCompleteness,
      label: "Website Completeness",
    };

    // 5. Company Info Completeness (geography match, store count, size details)
    let companyInfoRaw = 30;
    let points = 30;
    const countrySource = (company.country ?? company.address ?? "").toUpperCase();
    const primaryMarkets = ["US", "UK", "CA", "AU", "EU", "FR", "DE", "GB", "UNITED STATES", "UNITED KINGDOM", "CANADA", "AUSTRALIA"];
    if (primaryMarkets.some((m) => countrySource.includes(m))) points += 30;
    
    const effectiveStoreCount = company.crawlData?.storeCount ?? company.storeCount ?? null;
    if (effectiveStoreCount !== null) {
      if (effectiveStoreCount >= 10) points += 40;
      else if (effectiveStoreCount >= 2) points += 30;
      else points += 15;
    } else if (company.employeeCountBand || company.revenueBand) {
      points += 20;
    }
    companyInfoRaw = Math.min(100, points);

    breakdown.companyInfoCompleteness = {
      raw: companyInfoRaw,
      weight: template.companyInfoCompleteness,
      contribution: companyInfoRaw * template.companyInfoCompleteness,
      label: "Company Info Completeness",
    };

    // 6. AI Confidence Score
    const aiConfidenceRaw = aiConfidenceScore ?? 50;
    breakdown.aiConfidence = {
      raw: aiConfidenceRaw,
      weight: template.aiConfidence,
      contribution: aiConfidenceRaw * template.aiConfidence,
      label: "AI Confidence",
    };

    // Legacy fields mapped for compatibility with frontend/SDR builder
    breakdown.categoryFit = breakdown.industryMatch;
    breakdown.brandMatch = breakdown.productMatch;
    breakdown.competitorPresence = breakdown.productMatch;
    breakdown.storeCount = breakdown.companyInfoCompleteness;
    breakdown.websiteQuality = breakdown.websiteCompleteness;

    // Total Opportunity Score
    let totalScore = 0;
    for (const key of ["industryMatch", "productMatch", "buyingSignals", "websiteCompleteness", "companyInfoCompleteness", "aiConfidence"]) {
      totalScore += breakdown[key].contribution;
    }
    totalScore = Math.round(totalScore);

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
