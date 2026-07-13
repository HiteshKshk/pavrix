import { checkDbConnection } from "../db/connection";
import { prisma } from "../db/prisma";
import { MemoryStore } from "../db/memory-store";
import { DiscoveryEngine, DiscoveredLead } from "../discovery.engine";
import { DiscoveryProviderFactory } from "../discovery/provider.factory";
import { SignalEngine } from "../signal.engine";
import { ScoringEngine } from "../scoring.engine";
import { AIService } from "./ai.service";
import { PlaywrightCrawler } from "../crawl/crawler";
import { CompanyRepository } from "../repositories/company.repository";
import { SearchRepository } from "../repositories/search.repository";
import { IcpRawInput } from "../../types/icp";
import { IcpExpansionResult } from "./ai.service";

// ─── Pipeline Result Types ────────────────────────────────────────────────────

export interface PipelineResult {
  companyId: string;
  name: string;
  isDuplicate: boolean;
  score: number;
  qualified: boolean;
  dbWarning?: string;
}

export type PipelineStage =
  | "building_icp"
  | "searching"
  | "crawling"
  | "signals"
  | "ranking"
  | "ai_analysis"
  | "complete"
  | "error";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  pct: number; // 0–100 progress estimate
  results?: PipelineResult[];
  searchId?: string;
  error?: string;
}

// ─── PipelineService ──────────────────────────────────────────────────────────

export class PipelineService {
  /**
   * Full ICP-driven pipeline — the end-to-end flow from Step 1 to Step 8.
   * Returns an AsyncGenerator emitting PipelineProgress events for SSE/polling.
   *
   * Steps:
   * 1. Expand ICP (LLM — Step 2)
   * 2. Discovery (Brave/Google/mock — Step 3)
   * 3. Deduplication (deterministic — Step 3)
   * 4. Crawl sites (Playwright+Cheerio — Step 4)
   * 5. Signal detection (deterministic — Step 5)
   * 6. Scoring (deterministic — Step 6)
   * 7. Stage gate ≥60 → embedding + similarity (Step 7)
   * 8. AI analysis for qualified leads (Step 8)
   */
  static async *runIcpPipeline(
    rawInput: IcpRawInput,
    discoveryProviderType?: string
  ): AsyncGenerator<PipelineProgress> {
    let searchId = "";

    try {
      // ── Stage 1: Expand ICP ───────────────────────────────────────────────
      yield {
        stage: "building_icp",
        message: "Building Ideal Customer Profile...",
        pct: 5,
      };

      let expandedProfile: IcpExpansionResult;
      try {
        expandedProfile = await AIService.generateIcpExpansion(rawInput);
      } catch (err) {
        console.error("[Pipeline] ICP expansion failed:", err);
        // Fallback: minimal expansion
        expandedProfile = {
          targetCompanies: [`${rawInput.industry} retailers in ${rawInput.country}`],
          exclude: ["manufacturers", "factories"],
          reasoning: "Fallback expansion — LLM unavailable.",
          searchVariants: [
            `${rawInput.industry} retailers ${rawInput.country}`,
            `${rawInput.keywords[0] ?? rawInput.industry} stores ${rawInput.country}`,
          ],
        };
      }

      // Persist the search record
      const searchRecord = await SearchRepository.create({
        rawInput,
        expandedProfile,
        searchVariants: expandedProfile.searchVariants,
      });
      searchId = searchRecord.id;

      yield {
        stage: "building_icp",
        message: `ICP expanded: ${expandedProfile.targetCompanies.length} target types identified`,
        pct: 15,
        searchId,
      };

      // ── Stage 2: Discovery ────────────────────────────────────────────────
      yield {
        stage: "searching",
        message: "Searching for matching companies...",
        pct: 20,
      };

      const discoveryProvider = DiscoveryProviderFactory.getProvider(discoveryProviderType);
      let discoveredCompanies = await discoveryProvider.search(rawInput, expandedProfile);

      yield {
        stage: "searching",
        message: `Found ${discoveredCompanies.length} candidate companies`,
        pct: 35,
      };

      // ── Stage 3: Deduplication ────────────────────────────────────────────
      const isDbLive = await checkDbConnection();
      let allCompanies: any[] = [];

      if (isDbLive) {
        try {
          allCompanies = await prisma.company.findMany({ select: { id: true, name: true, website: true, phone: true, address: true } });
        } catch {}
      }
      if (allCompanies.length === 0) {
        allCompanies = MemoryStore.getCompanies();
      }

      const uniqueCompanies = discoveredCompanies.filter((dc) => {
        const asLead: DiscoveredLead = {
          name: dc.name,
          address: rawInput.country,
          categoryTags: [rawInput.industry],
          website: dc.website,
          hasEcommerce: false,
        };
        return !DiscoveryEngine.syncCheckDuplicate(asLead, allCompanies);
      });

      yield {
        stage: "searching",
        message: `${uniqueCompanies.length} unique (${discoveredCompanies.length - uniqueCompanies.length} duplicates removed)`,
        pct: 40,
      };

      // ── Stage 4: Crawl ────────────────────────────────────────────────────
      yield {
        stage: "crawling",
        message: `Crawling ${uniqueCompanies.length} websites...`,
        pct: 42,
      };

      const allCategories: any[] = isDbLive
        ? await prisma.category.findMany().catch(() => [])
        : MemoryStore.getCategories();

      const catObj = allCategories.find(
        (c) => c.name.toLowerCase() === rawInput.industry.toLowerCase()
      ) ?? { brandKeywords: [] };
      const brandKeywords = (catObj.brandKeywords as string[]) ?? [];

      // Crawl all unique companies (with concurrency cap of 3)
      const crawlResults = await PipelineService.crawlConcurrent(
        uniqueCompanies.map((c) => c.website ?? ""),
        brandKeywords,
        3
      );

      yield {
        stage: "crawling",
        message: `Website analysis complete for ${crawlResults.filter((r) => !r?.error).length} sites`,
        pct: 58,
      };

      // ── Stage 5: Signals ──────────────────────────────────────────────────
      yield {
        stage: "signals",
        message: "Extracting buying signals...",
        pct: 60,
      };

      // ── Stage 6: Score + Save ─────────────────────────────────────────────
      yield {
        stage: "ranking",
        message: "Scoring and ranking companies...",
        pct: 65,
      };

      const results: PipelineResult[] = [];
      let rank = 0;

      for (let i = 0; i < uniqueCompanies.length; i++) {
        const dc = uniqueCompanies[i];
        const crawl = crawlResults[i];

        // Merge crawl data into lead structure
        const lead: DiscoveredLead = {
          name: dc.name,
          address: rawInput.country,
          country: rawInput.country,
          categoryTags: [rawInput.industry.toLowerCase()],
          website: dc.website,
          phone: crawl?.phone ?? undefined,
          hasEcommerce: crawl?.hasEcommerce ?? false,
          storeCount: crawl?.storeCount ?? undefined,
          mockWebsiteContent: crawl?.aboutText ?? dc.description ?? dc.snippet ?? "",
        };

        // Save company
        const savedComp = await CompanyRepository.create({
          name: lead.name,
          address: lead.address,
          country: rawInput.country,
          categoryTags: lead.categoryTags,
          website: lead.website,
          phone: lead.phone,
          source: "outbound",
          storeCount: lead.storeCount,
          hasEcommerce: lead.hasEcommerce,
          crawlData: crawl ?? null,
          crawledAt: crawl ? new Date() : undefined,
          status: "New",
        });

        // Detect signals
        const detected = SignalEngine.detectSignals(
          lead.mockWebsiteContent,
          brandKeywords,
          crawl ?? undefined
        );

        const savedSignals: any[] = [];
        for (const sig of detected) {
          let savedSig: any = null;
          if (isDbLive) {
            try {
              savedSig = await prisma.signal.create({
                data: {
                  companyId: savedComp.id,
                  type: sig.type,
                  detectedDate: new Date(),
                  pointValue: sig.pointValue,
                  description: sig.description,
                },
              });
            } catch {}
          }
          if (!savedSig) {
            savedSig = MemoryStore.addSignal({
              companyId: savedComp.id,
              type: sig.type,
              detectedDate: new Date().toISOString(),
              pointValue: sig.pointValue,
              description: sig.description,
            });
          }
          savedSignals.push(savedSig);
        }

        // Score against category
        const scoreRes = ScoringEngine.computeScore(
          { ...savedComp, crawlData: crawl ?? null },
          savedSignals,
          rawInput.industry,
          brandKeywords,
          catObj.weightTemplate as any,
          lead.mockWebsiteContent,
          rawInput.keywords
        );

        // Save score
        if (isDbLive) {
          try {
            await prisma.score.create({
              data: {
                companyId: savedComp.id,
                categoryName: rawInput.industry,
                totalScore: scoreRes.totalScore,
                breakdown: scoreRes.breakdown as any,
                scoreVersion: scoreRes.scoreVersion,
              },
            });
          } catch {}
        } else {
          MemoryStore.addScore({
            companyId: savedComp.id,
            categoryName: rawInput.industry,
            totalScore: scoreRes.totalScore,
            breakdown: scoreRes.breakdown,
            scoreVersion: scoreRes.scoreVersion,
          });
        }

        const isQualified = scoreRes.totalScore >= 60;
        rank++;

        await SearchRepository.linkCompany(searchId, savedComp.id, rank, isQualified);

        // ── Stage Gate ────────────────────────────────────────────────────────
        if (isQualified) {
          // Stage 7: Embedding
          const embeddingText = `${lead.name} ${rawInput.country} ${lead.mockWebsiteContent}`;
          const embedding = await AIService.generateEmbedding(embeddingText);
          await CompanyRepository.updateEmbedding(savedComp.id, embedding);

          // Stage 8: AI Analysis
          const [summary, explanation, decisionMaker, outreachBundle] = await Promise.allSettled([
            AIService.generateCompanySummary({ ...savedComp, crawlData: crawl }),
            AIService.generateScoreExplanation(
              savedComp.name,
              rawInput.industry,
              scoreRes.totalScore,
              scoreRes.breakdown as any
            ),
            AIService.suggestDecisionMaker(
              { name: savedComp.name, categoryTags: savedComp.categoryTags, storeCount: savedComp.storeCount },
              rawInput.industry
            ),
            AIService.generateOutreachBundle(
              { name: savedComp.name, categoryTags: savedComp.categoryTags, website: savedComp.website, country: rawInput.country },
              rawInput.industry,
              scoreRes.totalScore,
              savedSignals,
              scoreRes.breakdown as any
            ),
          ]);

          const summaryValue =
            summary.status === "fulfilled" ? summary.value : "";
          const explanationValue =
            explanation.status === "fulfilled" ? explanation.value : "";
          const decisionMakerValue =
            decisionMaker.status === "fulfilled" ? decisionMaker.value : "Director of Merchandising";
          const outreach =
            outreachBundle.status === "fulfilled" ? outreachBundle.value : null;

          // Update company with AI data
          await CompanyRepository.update(savedComp.id, {
            description: summaryValue,
            aiExplanation: explanationValue,
            decisionMakerTitle: decisionMakerValue,
          });

          // Save outreach bundle
          if (outreach) {
            if (isDbLive) {
              try {
                await prisma.outreach.create({
                  data: {
                    companyId: savedComp.id,
                    emailSubject: outreach.emailSubject,
                    draftText: outreach.emailContent,
                    linkedinDraft: outreach.linkedinMessage,
                    followupDraft: outreach.followupEmail,
                    status: "drafted",
                    signalsReferenced: outreach.signalsReferenced as any,
                  },
                });
              } catch {}
            } else {
              MemoryStore.addOutreach({
                companyId: savedComp.id,
                draftText: outreach.emailContent,
                status: "drafted",
                signalsReferenced: outreach.signalsReferenced,
              });
            }
          }
        }

        results.push({
          companyId: savedComp.id,
          name: lead.name,
          isDuplicate: false,
          score: scoreRes.totalScore,
          qualified: isQualified,
          dbWarning: isDbLive ? undefined : "Running in Simulated Data Mode (in-memory)",
        });
      }

      // ── Stage 8: Complete ─────────────────────────────────────────────────
      yield {
        stage: "ai_analysis",
        message: "AI insights generated",
        pct: 95,
      };

      const qualified = results.filter((r) => r.qualified).length;
      await SearchRepository.complete(searchId, results.length, qualified);

      yield {
        stage: "complete",
        message: `Pipeline complete — ${results.length} companies, ${qualified} qualified`,
        pct: 100,
        results,
        searchId,
      };
    } catch (err) {
      console.error("[PipelineService] Pipeline error:", err);
      if (searchId) await SearchRepository.markError(searchId);

      yield {
        stage: "error",
        message: `Pipeline error: ${String(err).slice(0, 200)}`,
        pct: 0,
        error: String(err),
      };
    }
  }

  /**
   * Legacy ingestLeads — preserved for backward compatibility with inbound form and CSV ingestion.
   */
  static async ingestLeads(
    rawLeads: DiscoveredLead[],
    source: "inbound" | "outbound"
  ): Promise<PipelineResult[]> {
    const isDbLive = await checkDbConnection();
    const results: PipelineResult[] = [];

    let allCategories: any[] = [];
    let allCompanies: any[] = [];

    if (isDbLive) {
      try {
        allCategories = await prisma.category.findMany();
        allCompanies = await prisma.company.findMany();
      } catch {}
    }

    if (allCategories.length === 0) allCategories = MemoryStore.getCategories();
    if (allCompanies.length === 0) allCompanies = MemoryStore.getCompanies();

    for (const lead of rawLeads) {
      const isDuplicate = await DiscoveryEngine.checkDuplicate(lead, allCompanies);
      if (isDuplicate) {
        results.push({ companyId: "", name: lead.name, isDuplicate: true, score: 0, qualified: false });
        continue;
      }

      const savedComp = await CompanyRepository.create({
        name: lead.name,
        address: lead.address,
        country: (lead as any).country,
        categoryTags: lead.categoryTags,
        website: lead.website,
        phone: lead.phone,
        source,
        storeCount: lead.storeCount,
        hasEcommerce: lead.hasEcommerce,
        revenueBand: lead.revenueBand,
        employeeCountBand: lead.employeeCountBand,
        status: "New",
      });

      const primaryCat = lead.categoryTags[0] ?? "sportswear";
      const catObj = allCategories.find((c) => c.name.toLowerCase() === primaryCat.toLowerCase()) ?? { brandKeywords: [] };
      const brandKws = (catObj.brandKeywords as string[]) ?? [];

      const detected = SignalEngine.detectSignals(lead.mockWebsiteContent ?? lead.name, brandKws);
      const savedSignals: any[] = [];

      for (const sig of detected) {
        let savedSig: any = null;
        if (isDbLive) {
          try {
            savedSig = await prisma.signal.create({
              data: {
                companyId: savedComp.id,
                type: sig.type,
                detectedDate: new Date(),
                pointValue: sig.pointValue,
                description: sig.description,
              },
            });
          } catch {}
        }
        if (!savedSig) {
          savedSig = MemoryStore.addSignal({
            companyId: savedComp.id,
            type: sig.type,
            detectedDate: new Date().toISOString(),
            pointValue: sig.pointValue,
            description: sig.description,
          });
        }
        savedSignals.push(savedSig);
      }

      let bestScore = 0;
      let bestBreakdown: any = {};

      for (const catName of lead.categoryTags) {
        const cat = allCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase()) ?? {
          weightTemplate: {},
          brandKeywords: [],
        };

        const scoreRes = ScoringEngine.computeScore(
          savedComp,
          savedSignals,
          catName,
          cat.brandKeywords as string[],
          cat.weightTemplate as any,
          lead.mockWebsiteContent
        );

        if (scoreRes.totalScore > bestScore) {
          bestScore = scoreRes.totalScore;
          bestBreakdown = scoreRes.breakdown;
        }

        if (isDbLive) {
          try {
            await prisma.score.create({
              data: {
                companyId: savedComp.id,
                categoryName: catName,
                totalScore: scoreRes.totalScore,
                breakdown: scoreRes.breakdown as any,
                scoreVersion: scoreRes.scoreVersion,
              },
            });
          } catch {}
        } else {
          MemoryStore.addScore({
            companyId: savedComp.id,
            categoryName: catName,
            totalScore: scoreRes.totalScore,
            breakdown: scoreRes.breakdown,
            scoreVersion: scoreRes.scoreVersion,
          });
        }
      }

      const isQualified = bestScore >= 60;
      if (isQualified) {
        const embedding = await AIService.generateEmbedding(
          `${lead.name} ${lead.address} ${lead.mockWebsiteContent ?? ""}`
        );
        await CompanyRepository.updateEmbedding(savedComp.id, embedding);

        const [summary, explanation, outreach] = await Promise.allSettled([
          AIService.generateCompanySummary(savedComp),
          AIService.generateScoreExplanation(savedComp.name, primaryCat, bestScore, bestBreakdown),
          AIService.generateOutreachDraft(savedComp, primaryCat, bestScore, savedSignals, bestBreakdown),
        ]);

        await CompanyRepository.update(savedComp.id, {
          description: summary.status === "fulfilled" ? summary.value : undefined,
          aiExplanation: explanation.status === "fulfilled" ? explanation.value : undefined,
        });

        if (outreach.status === "fulfilled") {
          if (isDbLive) {
            try {
              await prisma.outreach.create({
                data: {
                  companyId: savedComp.id,
                  emailSubject: outreach.value.subject,
                  draftText: outreach.value.content,
                  status: "drafted",
                  signalsReferenced: outreach.value.signalsReferenced as any,
                },
              });
            } catch {}
          } else {
            MemoryStore.addOutreach({
              companyId: savedComp.id,
              draftText: outreach.value.content,
              status: "drafted",
              signalsReferenced: outreach.value.signalsReferenced,
            });
          }
        }
      }

      results.push({
        companyId: savedComp.id,
        name: lead.name,
        isDuplicate: false,
        score: bestScore,
        qualified: isQualified,
        dbWarning: isDbLive ? undefined : "Running in Simulated Data Mode (in-memory)",
      });
    }

    return results;
  }

  /**
   * Crawls a list of URLs concurrently with a concurrency cap.
   */
  private static async crawlConcurrent(
    urls: string[],
    brandKeywords: string[],
    concurrency: number
  ) {
    const results: any[] = new Array(urls.length).fill(null);
    const queue = urls.map((url, i) => ({ url, i }));

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        try {
          if (!item.url || item.url.trim() === "") {
            results[item.i] = null;
          } else {
            results[item.i] = await PlaywrightCrawler.crawl(item.url, brandKeywords);
          }
        } catch {
          results[item.i] = null;
        }
      }
    });

    await Promise.all(workers);
    return results;
  }
}
