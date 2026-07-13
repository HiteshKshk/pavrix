import { prisma } from "../db/prisma";
import { checkDbConnection } from "../db/connection";
import { MemoryStore } from "../db/memory-store";
import { PipelineService } from "./pipeline.service";

export interface LeadFilter {
  category?: string;
  band?: string;
  source?: string;
  status?: string;
  country?: string;
  search?: string;
  similarTo?: string;
  limit?: number;
}

export class LeadService {
  /**
   * Retrieves leads (companies with best scores and details).
   * Automatically executes PostgreSQL pgvector similarity queries or falls back to MemoryStore Jaccard checks.
   */
  static async getLeads(filters: LeadFilter = {}) {
    const isDbLive = await checkDbConnection();
    let companies: any[] = [];

    const limit = filters.limit || 50;

    if (isDbLive) {
      try {
        if (filters.similarTo) {
          // Live Database: Run pgvector cosine similarity search using <=>
          // Jumps straight to pgvector raw query for high-performance semantic retrieval
          const similarCompanies = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, name, address, category_tags as "categoryTags", website, phone, source,
                    store_count as "storeCount", has_ecommerce as "hasEcommerce", revenue_band as "revenueBand",
                    employee_count_band as "employeeCountBand", description, ai_explanation as "aiExplanation",
                    (embedding <=> (SELECT embedding FROM companies WHERE id = $1)) as distance
             FROM companies
             WHERE id != $1 AND embedding IS NOT NULL
             ORDER BY distance ASC
             LIMIT $2`,
            filters.similarTo,
            limit
          );

          // Hydrate scores & signals for the similar companies
          const ids = similarCompanies.map(c => c.id);
          const scores = await prisma.score.findMany({ where: { companyId: { in: ids } } });
          const signals = await prisma.signal.findMany({ where: { companyId: { in: ids } } });
          const outreach = await prisma.outreach.findMany({ where: { companyId: { in: ids } } });

          companies = similarCompanies.map(c => ({
            ...c,
            scores: scores.filter(s => s.companyId === c.id),
            signals: signals.filter(s => s.companyId === c.id),
            outreach: outreach.filter(o => o.companyId === c.id),
          }));
        } else {
          // Regular fetch with Prisma
          companies = await prisma.company.findMany({
            include: {
              scores: true,
              signals: true,
              outreach: true,
            },
            orderBy: { createdAt: "desc" },
          });
        }
      } catch (err) {
        console.warn("[LeadService] Live DB list query failed, using memory fallback:", err);
      }
    }

    // Offline / Memory fallback
    if (companies.length === 0) {
      if (filters.similarTo) {
        companies = MemoryStore.findSimilarCompanies(filters.similarTo, limit).map(c => {
          const scores = MemoryStore.getScores(c.id);
          const signals = MemoryStore.getSignals(c.id);
          const outreach = MemoryStore.getOutreach(c.id);
          return {
            ...c,
            scores,
            signals,
            outreach,
          };
        });
      } else {
        companies = MemoryStore.getCompanies().map(c => {
          const scores = MemoryStore.getScores(c.id);
          const signals = MemoryStore.getSignals(c.id);
          const outreach = MemoryStore.getOutreach(c.id);
          return {
            ...c,
            scores,
            signals,
            outreach,
          };
        });
      }
    }

    // Process best score and category for each lead, then apply filters
    let leads = companies.map((c) => {
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

      // Classify score into band
      let scoreBand: "Hot" | "Warm" | "Nurture" | "Deprioritize" = "Deprioritize";
      if (bestScore >= 80) scoreBand = "Hot";
      else if (bestScore >= 60) scoreBand = "Warm";
      else if (bestScore >= 40) scoreBand = "Nurture";

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
        scoreBand,
        status: c.status ?? "New",
        country: c.country ?? c.address ?? "",
        signals: c.signals || [],
        outreach: c.outreach || [],
        similarity: c.similarity ?? undefined,
      };
    });

    // Sort: if similarTo, sort by similarity. Otherwise, sort by score descending.
    if (filters.similarTo) {
      leads.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else {
      leads.sort((a, b) => b.score - a.score);
    }

    // Apply filters
    if (filters.category && filters.category !== "all") {
      const catLower = filters.category.toLowerCase();
      leads = leads.filter(l => 
        companies.find(c => c.id === l.id)?.categoryTags.map((t: string) => t.toLowerCase()).includes(catLower)
      );
    }

    if (filters.band && filters.band !== "all") {
      leads = leads.filter(l => l.scoreBand.toLowerCase() === filters.band!.toLowerCase());
    }

    if (filters.source && filters.source !== "all") {
      leads = leads.filter(l => l.source === filters.source);
    }

    if (filters.status && filters.status !== "all") {
      leads = leads.filter(l => (l.status ?? "New").toLowerCase() === filters.status!.toLowerCase());
    }

    if (filters.country && filters.country !== "all") {
      const countryLower = filters.country.toLowerCase();
      leads = leads.filter(l =>
        (l.country ?? l.address ?? "").toLowerCase().includes(countryLower)
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      leads = leads.filter(l => 
        l.name.toLowerCase().includes(searchLower) ||
        (l.website && l.website.toLowerCase().includes(searchLower)) ||
        l.address.toLowerCase().includes(searchLower)
      );
    }

    return leads;
  }

  /**
   * Retrieves a single company lead with all details
   */
  static async getLead(companyId: string) {
    const isDbLive = await checkDbConnection();
    let comp: any = null;

    if (isDbLive) {
      try {
        comp = await prisma.company.findUnique({
          where: { id: companyId },
          include: {
            scores: true,
            signals: true,
            outreach: true,
          },
        });
      } catch (err) {
        console.warn("[LeadService] Live DB fetch company failed, falling back to memory:", err);
      }
    }

    if (!comp) {
      const c = MemoryStore.getCompany(companyId);
      if (c) {
        comp = {
          ...c,
          scores: MemoryStore.getScores(companyId),
          signals: MemoryStore.getSignals(companyId),
          outreach: MemoryStore.getOutreach(companyId),
        };
      }
    }

    if (!comp) return null;

    let bestScore = 0;
    let bestCategory = comp.categoryTags[0] || "General";
    if (comp.scores && comp.scores.length > 0) {
      comp.scores.forEach((s: any) => {
        if (s.totalScore > bestScore) {
          bestScore = s.totalScore;
          bestCategory = s.categoryName;
        }
      });
    }

    let scoreBand = "Deprioritize";
    if (bestScore >= 80) scoreBand = "Hot";
    else if (bestScore >= 60) scoreBand = "Warm";
    else if (bestScore >= 40) scoreBand = "Nurture";

    return {
      id: comp.id,
      name: comp.name,
      address: comp.address,
      website: comp.website,
      phone: comp.phone,
      source: comp.source,
      hasEcommerce: comp.hasEcommerce,
      storeCount: comp.storeCount,
      revenueBand: comp.revenueBand,
      employeeCountBand: comp.employeeCountBand,
      description: comp.description || comp.mockWebsiteContent || "",
      aiExplanation: comp.aiExplanation || "",
      bestCategory,
      score: bestScore,
      scoreBand,
      scores: comp.scores || [],
      signals: comp.signals || [],
      outreach: comp.outreach || [],
    };
  }

  /**
   * Updates an outreach draft's text or status
   */
  static async updateOutreach(
    outreachId: string,
    draftText: string,
    status: "drafted" | "approved" | "sent"
  ) {
    const isDbLive = await checkDbConnection();
    if (isDbLive) {
      try {
        return await prisma.outreach.update({
          where: { id: outreachId },
          data: {
            draftText,
            status,
          },
        });
      } catch (err) {
        console.warn("[LeadService] Failed to update outreach in live DB, using memory fallback.");
      }
    }

    return MemoryStore.updateOutreach(outreachId, draftText, status);
  }

  /**
   * Submits an inbound contact form submission.
   * Feeds into companies tagged source: inbound and scores it instantly in the unified queue.
   */
  static async submitInboundForm(data: {
    name: string;
    website?: string;
    phone?: string;
    address?: string;
    categoryName?: string;
    revenueBand?: string;
    employeeCountBand?: string;
    storeCount?: number;
    hasEcommerce: boolean;
    contactEmail?: string;
    message?: string;
  }) {
    const isDbLive = await checkDbConnection();
    let savedLead: any = null;

    if (isDbLive) {
      try {
        savedLead = await prisma.leadInbound.create({
          data: {
            name: data.name,
            website: data.website,
            phone: data.phone,
            address: data.address,
            categoryName: data.categoryName,
            revenueBand: data.revenueBand,
            employeeCountBand: data.employeeCountBand,
            storeCount: data.storeCount,
            hasEcommerce: data.hasEcommerce,
            contactEmail: data.contactEmail,
            message: data.message,
          },
        });
      } catch (err) {
        console.warn("[LeadService] Live DB save inbound form failed, using memory fallback.");
      }
    }

    if (!savedLead) {
      savedLead = MemoryStore.addLeadInbound(data);
    }

    // Create discovered lead record and run the scoring/ingestion pipeline immediately!
    const discoveredLead = {
      name: data.name,
      address: data.address || "Unknown Address",
      categoryTags: [data.categoryName || "sportswear"],
      website: data.website || undefined,
      phone: data.phone || undefined,
      revenueBand: data.revenueBand || "< $1M",
      employeeCountBand: data.employeeCountBand || "1-10",
      storeCount: data.storeCount || 1,
      hasEcommerce: data.hasEcommerce,
      mockWebsiteContent: `Inbound request message: "${data.message || "No message supplied"}" from contact email ${data.contactEmail || "unknown"}. We are interested in wholesale buying partnership.`,
    };

    const pipelineResult = await PipelineService.ingestLeads([discoveredLead], "inbound");
    
    // Mark inbound lead as processed
    if (isDbLive && savedLead.id) {
      try {
        await prisma.leadInbound.update({
          where: { id: savedLead.id },
          data: { processed: true },
        });
      } catch (e) {}
    } else {
      MemoryStore.updateLeadInboundProcessed(savedLead.id);
    }

    return {
      success: true,
      leadId: pipelineResult[0]?.companyId || savedLead.id,
      pipelineResult: pipelineResult[0],
    };
  }
}
