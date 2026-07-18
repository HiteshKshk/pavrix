import { inngest } from "./client";
import { checkDbConnection } from "../db/connection";
import { prisma } from "../db/prisma";
import { MemoryStore } from "../db/memory-store";
import { MemoryCache } from "../db/memory-cache";
import { DiscoveryEngine, DiscoveredLead } from "../discovery.engine";
import { DiscoveryProviderFactory } from "../discovery/provider.factory";
import { DiscoveredCompany } from "../discovery/provider.interface";
import { SignalEngine } from "../signal.engine";
import { ScoringEngine } from "../scoring.engine";
import { AIService } from "../services/ai.service";
import { PlaywrightCrawler } from "../crawl/crawler";
import { CompanyRepository } from "../repositories/company.repository";
import { SearchRepository } from "../repositories/search.repository";
import { IcpRawInput } from "../../types/icp";

export const pipelineJob = inngest.createFunction(
  {
    id: "pavrix-pipeline",
    name: "End-to-End Sales Pipeline",
    triggers: [{ event: "pavrix/pipeline.start" }],
  },
  async ({ event, step }: any) => {
    const { rawInput, discoveryProviderType, searchId } = event.data as {
      rawInput: IcpRawInput;
      discoveryProviderType?: string;
      searchId: string;
    };

    // ── Step 1: Expand ICP ─────────────────────────────────────────────────
    const expandedProfile = await step.run("expand-icp", async () => {
      return await AIService.generateIcpExpansion(rawInput);
    });

    // Update search record in db with variants
    await step.run("update-search-variants", async () => {
      const isDbLive = await checkDbConnection();
      if (isDbLive) {
        try {
          await prisma.icpSearch.update({
            where: { id: searchId },
            data: {
              searchVariants: expandedProfile.searchVariants,
              expandedProfile: expandedProfile as any,
            },
          });
        } catch {}
      }
    });

    // ── Step 2: Search / Discovery with Cache ────────────────────────────────
    const discoveredCompanies = await step.run("discover-companies", async () => {
      const discoveryProvider = DiscoveryProviderFactory.getProvider(discoveryProviderType);
      const keywords = expandedProfile.searchKeywords ?? expandedProfile.searchVariants ?? [
        `${rawInput.industry} in ${rawInput.country}`
      ];

      const ttlDays = parseInt(process.env.SEARCH_CACHE_TTL_DAYS ?? "30", 10);
      const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

      const resultsList: DiscoveredCompany[] = [];
      const isDbLive = await checkDbConnection();

      for (const keyword of keywords) {
        if (!keyword.trim()) continue;
        let cachedResults: DiscoveredCompany[] | null = null;
        const cleanKw = keyword.toLowerCase().trim();

        // 1. Check cache
        if (isDbLive) {
          try {
            const entry = await prisma.searchKeyword.findUnique({
              where: { keyword: cleanKw }
            });
            if (entry) {
              const age = Date.now() - new Date(entry.updatedAt).getTime();
              if (age < ttlMs) {
                cachedResults = entry.results as unknown as DiscoveredCompany[];
              }
            }
          } catch {}
        } else {
          const entry = MemoryCache.getSearchKeyword(cleanKw);
          if (entry) {
            const age = Date.now() - new Date(entry.updatedAt).getTime();
            if (age < ttlMs) {
              cachedResults = entry.results as unknown as DiscoveredCompany[];
            }
          }
        }

        // 2. Fetch from provider if missing/stale
        if (cachedResults) {
          resultsList.push(...cachedResults);
        } else {
          try {
            const freshResults = await discoveryProvider.search([keyword]);
            resultsList.push(...freshResults);

            if (isDbLive) {
              try {
                await prisma.searchKeyword.upsert({
                  where: { keyword: cleanKw },
                  create: {
                    keyword: cleanKw,
                    results: freshResults as any,
                  },
                  update: {
                    results: freshResults as any,
                    updatedAt: new Date(),
                  }
                });
              } catch {}
            } else {
              MemoryCache.setSearchKeyword(keyword, freshResults);
            }
          } catch (e) {
            console.error(`[Inngest Pipeline] Provider search failed for "${keyword}":`, e);
          }
        }
      }

      // Deduplicate by root domain within the batch
      const seenBatchDomains = new Set<string>();
      return resultsList.filter((dc) => {
        if (!dc.website) return true;
        const domain = CompanyRepository.extractDomain(dc.website);
        if (!domain) return true;
        if (seenBatchDomains.has(domain)) return false;
        seenBatchDomains.add(domain);
        return true;
      });
    });

    // ── Step 3: Filter duplicates against DB ─────────────────────────────────
    const uniqueCompanies = await step.run("filter-duplicates", async () => {
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

      return discoveredCompanies.filter((dc: any) => {
        const asLead: DiscoveredLead = {
          name: dc.name,
          address: rawInput.country,
          categoryTags: [rawInput.industry],
          website: dc.website,
          hasEcommerce: false,
        };
        return !DiscoveryEngine.syncCheckDuplicate(asLead, allCompanies);
      });
    });

    // ── Step 4: Crawl Sites ────────────────────────────────────────────────
    const crawlResults = await step.run("crawl-websites", async () => {
      const isDbLive = await checkDbConnection();
      const allCategories: any[] = isDbLive
        ? await prisma.category.findMany().catch(() => [])
        : MemoryStore.getCategories();

      const catObj = allCategories.find(
        (c) => c.name.toLowerCase() === rawInput.industry.toLowerCase()
      ) ?? { brandKeywords: [] };
      const brandKeywords = (catObj.brandKeywords as string[]) ?? [];

      // Crawl concurrently
      const results: any[] = new Array(uniqueCompanies.length).fill(null);
      const queue = uniqueCompanies.map((c: any, i: number) => ({ url: c.website ?? "", i }));
      const concurrency = 3;

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
    });

    // ── Step 5: AI Analysis, Scoring, and Saving (Step-by-Step Per Lead) ────
    const pipelineResults = [];
    let qualifiedCount = 0;

    for (let i = 0; i < uniqueCompanies.length; i++) {
      const dc = uniqueCompanies[i];
      const crawl = crawlResults[i];

      // Wrap each lead in a try/catch so failure on one doesn't crash the whole batch
      try {
        const runRes = await step.run(`process-lead-${i}-${dc.name.replace(/[^a-zA-Z0-9]/g, "")}`, async () => {
          const isDbLive = await checkDbConnection();
          const mockWebsiteContent = crawl?.aboutText ?? (dc as any).description ?? dc.snippet ?? "";

          // AI Analysis
          const analysis = await AIService.analyzeCompany(mockWebsiteContent, rawInput);
          const compStatus = analysis.status === "analysis_failed" ? "analysis_failed" : "New";

          // Save Company
          const savedComp = await CompanyRepository.create({
            name: dc.name,
            address: rawInput.country,
            country: rawInput.country,
            categoryTags: [rawInput.industry.toLowerCase()],
            website: dc.website,
            phone: crawl?.phone ?? undefined,
            source: "outbound",
            storeCount: crawl?.storeCount ?? undefined,
            hasEcommerce: crawl?.hasEcommerce ?? false,
            crawlData: crawl ?? null,
            crawledAt: crawl ? new Date() : undefined,
            status: compStatus as any,
            description: analysis.companySummary,
          });

          // Save WebsiteContent
          if (crawl && !crawl.error) {
            if (isDbLive) {
              try {
                await prisma.websiteContent.create({
                  data: {
                    companyId: savedComp.id,
                    url: dc.website ?? "",
                    content: crawl.aboutText,
                  }
                });
              } catch {}
            } else {
              MemoryCache.addWebsiteContent(savedComp.id, dc.website ?? "", crawl.aboutText);
            }
          }

          // Detect signals
          const allCategories: any[] = isDbLive
            ? await prisma.category.findMany().catch(() => [])
            : MemoryStore.getCategories();
          const catObj = allCategories.find(
            (c) => c.name.toLowerCase() === rawInput.industry.toLowerCase()
          ) ?? { brandKeywords: [] };
          const brandKeywords = (catObj.brandKeywords as string[]) ?? [];

          const detected = SignalEngine.detectSignals(mockWebsiteContent, brandKeywords, crawl);
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
                    sourceField: sig.sourceField,
                    matchedText: sig.matchedText,
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
                sourceField: sig.sourceField,
                matchedText: sig.matchedText,
              });
            }
            savedSignals.push(savedSig);
          }

          // Scoring
          const scoreRes = ScoringEngine.computeScore(
            { ...savedComp, crawlData: crawl ?? null },
            savedSignals,
            rawInput.industry,
            brandKeywords,
            catObj.weightTemplate as any,
            mockWebsiteContent,
            rawInput.keywords,
            analysis.confidenceScore
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

          const isQualified = scoreRes.totalScore >= 40;
          await SearchRepository.linkCompany(searchId, savedComp.id, i + 1, isQualified);

          // Stage Gate: qualified → generate embedding & outreach bundle
          if (isQualified) {
            const embeddingText = `${dc.name} ${rawInput.country} ${mockWebsiteContent}`;
            const embedding = await AIService.generateEmbedding(embeddingText);
            await CompanyRepository.updateEmbedding(savedComp.id, embedding);

            // Generate outreach Bundle
            try {
              const outreach = await AIService.generateOutreachBundle(
                { name: savedComp.name, categoryTags: savedComp.categoryTags, website: savedComp.website, country: rawInput.country },
                rawInput.industry,
                scoreRes.totalScore,
                savedSignals,
                scoreRes.breakdown as any
              );

              if (isDbLive) {
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
              } else {
                MemoryStore.addOutreach({
                  companyId: savedComp.id,
                  draftText: outreach.emailContent,
                  status: "drafted",
                  signalsReferenced: outreach.signalsReferenced,
                });
              }
            } catch (e) {
              console.error(`[Inngest Pipeline] Outreach generation failed for "${dc.name}":`, e);
            }
          }

          return {
            companyId: savedComp.id,
            name: dc.name,
            score: scoreRes.totalScore,
            qualified: isQualified,
          };
        });

        pipelineResults.push(runRes);
        if (runRes.qualified) qualifiedCount++;
      } catch (err) {
        console.error(`[Inngest Pipeline] Failed to process company "${dc.name}":`, err);
        // Ensure failed companies are recorded but do not crash the batch job
      }
    }

    // ── Step 6: Complete Search Record ───────────────────────────────────────
    await step.run("complete-search", async () => {
      await SearchRepository.complete(searchId, pipelineResults.length, qualifiedCount);
    });

    return {
      success: true,
      processed: pipelineResults.length,
      qualified: qualifiedCount,
    };
  }
);
