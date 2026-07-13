import { prisma } from "../db/prisma";
import { checkDbConnection } from "../db/connection";
import { MemoryStore } from "../db/memory-store";

export class DashboardService {
  /**
   * Generates sales metrics and distribution data for the dashboard.
   */
  static async getMetrics() {
    let isDbLive = await checkDbConnection();
    let companies: any[] = [];
    let inboundLeadsRaw: any[] = [];
    let dbWarning: string | undefined = undefined;

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
        console.warn("[DashboardService] Live DB query failed, falling back to memory:", error);
        isDbLive = false;
      }
    }

    if (!isDbLive || companies.length === 0) {
      companies = MemoryStore.getCompanies().map(c => {
        const scores = MemoryStore.getScores(c.id);
        const signals = MemoryStore.getSignals(c.id);
        return {
          ...c,
          scores,
          signals,
        };
      });
      inboundLeadsRaw = MemoryStore.getLeadsInbound();
      dbWarning = "Running in Simulated Data Mode (in-memory)";
    }

    // Process aggregations in JavaScript (robust, unified for both DB and memory mode)
    const totalDiscovered = companies.length;
    let qualifiedCount = 0;
    let inboundCount = 0;
    let outboundCount = 0;

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

      // Category distributions
      c.categoryTags.forEach((cat: string) => {
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

    return {
      stats: {
        totalDiscovered,
        qualifiedCount,
        inboundCount,
        outboundCount,
        categoriesCount: categoryDistribution.length,
      },
      categoryDistribution,
      recentLeads: formattedLeads.slice(0, 5),
      allLeads: formattedLeads,
      inboundFormCount: inboundLeadsRaw.length,
      dbWarning,
    };
  }
}
