import { prisma } from "../db/prisma";
import { checkDbConnection } from "../db/connection";
import { SerpApiProvider } from "../discovery/serpapi.provider";

export class DashboardService {
  /**
   * Generates sales metrics and distribution data for the dashboard.
   */
  static async getMetrics() {
    const isDbLive = await checkDbConnection();
    let companies: any[] = [];
    let inboundLeadsRaw: any[] = [];
    const dbWarning: string | undefined = undefined;

    if (isDbLive) {
      try {
        companies = await prisma.company.findMany({
          include: {
            scores: true,
            signals: true,
          },
          orderBy: { createdAt: "desc" },
        });
        inboundLeadsRaw = await prisma.leadInbound.findMany();
      } catch (error) {
        console.warn("[DashboardService] Live DB query failed:", error);
      }
    }

    // Only fall back to memory store when DB is completely offline
    if (!isDbLive) {
      const { MemoryStore } = await import("../db/memory-store");
      companies = MemoryStore.getCompanies().map((c: any) => ({
        ...c,
        scores: MemoryStore.getScores(c.id),
        signals: MemoryStore.getSignals(c.id),
      }));
      inboundLeadsRaw = MemoryStore.getLeadsInbound();
    }

    // Process aggregations in JavaScript (robust, unified for both DB and memory mode)
    const totalDiscovered = companies.length;
    let qualifiedCount = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    const countriesSet = new Set<string>();

    const categoryCounts: Record<string, number> = {};

    const formattedLeads = companies.map((c) => {
      // Find best score
      let bestScore = 0;
      let bestCategory = c.categoryTags[0] || "General";
      
      if (c.scores && c.scores.length > 0) {
        c.scores.forEach((s: any) => {
          if (s.totalScore > bestScore) {
            bestScore = s.totalScore;
            bestCategory = s.categoryName;
          }
        });
      }

      if (bestScore >= 60) {
        qualifiedCount++;
      }

      if (c.source === "inbound") {
        inboundCount++;
      } else {
        outboundCount++;
      }

      // Track unique countries
      const countryStr: string = c.country || c.address || "";
      if (countryStr) {
        // Extract country-like segment (last part after last comma, or whole string if short)
        const parts = countryStr.split(",").map((p: string) => p.trim()).filter(Boolean);
        const country = parts[parts.length - 1] || countryStr;
        if (country.length <= 50) countriesSet.add(country);
      }

      // Category distributions
      (c.categoryTags as string[]).forEach((cat: string) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      return {
        id: c.id,
        name: c.name,
        address: c.address,
        website: c.website,
        phone: c.phone,
        source: c.source,
        hasEcommerce: c.hasEcommerce,
        storeCount: c.storeCount,
        revenueBand: c.revenueBand,
        employeeCountBand: c.employeeCountBand,
        description: c.description || c.mockWebsiteContent || "",
        aiExplanation: c.aiExplanation || "",
        bestCategory,
        score: bestScore,
        signalsCount: c.signals ? c.signals.length : 0,
      };
    });

    // Sort leads by score descending
    formattedLeads.sort((a, b) => b.score - a.score);

    // Format category distribution as an array
    const categoryDistribution = Object.entries(categoryCounts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
    })).sort((a, b) => b.count - a.count);

    // Retrieve SerpAPI monthly usage metrics
    let serpApiUsage = 0;
    let serpApiLimit = 250;
    try {
      const serpApi = new SerpApiProvider();
      serpApiUsage = await serpApi.getMonthlyUsageCount();
      serpApiLimit = serpApi.getMaxQuota();
    } catch {}

    return {
      stats: {
        totalDiscovered,
        qualifiedCount,
        inboundCount,
        outboundCount,
        categoriesCount: categoryDistribution.length,
        countriesCount: countriesSet.size,
        serpApiUsage,
        serpApiLimit,
      },
      categoryDistribution,
      recentLeads: formattedLeads.slice(0, 10),
      allLeads: formattedLeads,
      inboundFormCount: inboundLeadsRaw.length,
      dbWarning,
    };
  }
}
