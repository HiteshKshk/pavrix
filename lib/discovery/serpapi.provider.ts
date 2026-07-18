import { DiscoveryProvider, DiscoveredCompany } from "./provider.interface";
import { checkDbConnection } from "../db/connection";
import { prisma } from "../db/prisma";
import { MemoryCache } from "../db/memory-cache";

/**
 * SerpApiProvider — discovers companies using Google Search results via SerpAPI.
 */
export class SerpApiProvider implements DiscoveryProvider {
  private readonly apiKey: string | null;
  private readonly maxQuota: number;
  private readonly warningThreshold: number;

  constructor() {
    const key = process.env.SERPAPI_API_KEY;
    this.apiKey = key && key.trim() !== "" ? key.trim() : null;

    this.maxQuota = parseInt(process.env.SERPAPI_MAX_MONTHLY_QUOTA ?? "250", 10);
    this.warningThreshold = parseFloat(process.env.SERPAPI_QUOTA_WARNING_THRESHOLD ?? "0.9");

    if (!this.apiKey) {
      console.warn("[SerpApiProvider] SERPAPI_API_KEY not configured. Falling back to mock results.");
    }
  }

  /**
   * Checks the monthly search count and enforces a hard-stop if the quota warning threshold is crossed.
   */
  async checkQuota(): Promise<{ allowed: boolean; currentUsage: number; maxAllowed: number }> {
    const usage = await this.getMonthlyUsage();
    const limit = Math.floor(this.maxQuota * this.warningThreshold);
    if (usage >= limit) {
      return { allowed: false, currentUsage: usage, maxAllowed: limit };
    }
    return { allowed: true, currentUsage: usage, maxAllowed: limit };
  }

  async getMonthlyUsageCount(): Promise<number> {
    return await this.getMonthlyUsage();
  }

  getMaxQuota(): number {
    return this.maxQuota;
  }

  private async getMonthlyUsage(): Promise<number> {
    const isDbLive = await checkDbConnection();
    if (isDbLive) {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await prisma.serpApiUsage.count({
          where: {
            timestamp: {
              gte: startOfMonth,
            },
          },
        });
        return count;
      } catch (e) {
        console.error("[SerpApiProvider] Database failed to query usage, using memory cache fallback:", e);
      }
    }
    return MemoryCache.getMonthlySerpApiUsageCount();
  }

  private async recordUsage(keyword: string, resultsCount: number): Promise<void> {
    const isDbLive = await checkDbConnection();
    if (isDbLive) {
      try {
        await prisma.serpApiUsage.create({
          data: {
            keyword,
            results: resultsCount,
          },
        });
        return;
      } catch (e) {
        console.error("[SerpApiProvider] Database failed to record usage, using memory cache fallback:", e);
      }
    }
    MemoryCache.addSerpApiUsage(keyword, resultsCount);
  }

  /**
   * Helper to extract root domain (hostname without www.)
   */
  private extractDomain(urlStr?: string): string {
    if (!urlStr) return "";
    try {
      const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      return parsed.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  /**
   * Execute discovery query for a batch of keywords
   */
  async search(keywords: string[]): Promise<DiscoveredCompany[]> {
    if (!this.apiKey) {
      console.warn("[SerpApiProvider] No API key configured. Returning mock/empty results.");
      return [];
    }

    const { allowed, currentUsage, maxAllowed } = await this.checkQuota();
    if (!allowed) {
      const errMsg = `SerpAPI Quota limit warning threshold crossed (${currentUsage}/${maxAllowed}). Searches are disabled.`;
      console.error(`[SerpApiProvider] ${errMsg}`);
      throw new Error(errMsg);
    }

    const results: DiscoveredCompany[] = [];
    const seenDomains = new Set<string>();

    for (const keyword of keywords) {
      if (!keyword.trim()) continue;

      let attempt = 0;
      const maxAttempts = 2;
      let data: any = null;

      while (attempt < maxAttempts) {
        attempt++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
          const url = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&engine=google&num=20&api_key=${this.apiKey}`;
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`SerpAPI returned HTTP status ${response.status}`);
          }

          data = await response.json();
          break; // break retry loop if successful
        } catch (err) {
          clearTimeout(timeoutId);
          console.warn(`[SerpApiProvider] Search attempt ${attempt} failed for "${keyword}":`, err);
          if (attempt >= maxAttempts) {
            console.error(`[SerpApiProvider] Retries exhausted for keyword "${keyword}". Skipping.`);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s before retry
          }
        }
      }

      const organicResults = data?.organic_results ?? [];
      await this.recordUsage(keyword, organicResults.length);
      console.info(`[SerpApiProvider] Queried SerpAPI for "${keyword}" -> found ${organicResults.length} organic results.`);

      for (const item of organicResults) {
        if (!item.link || !item.title) continue;

        const domain = this.extractDomain(item.link);
        if (!domain || seenDomains.has(domain)) continue;

        seenDomains.add(domain);
        results.push({
          name: item.title,
          website: item.link,
          title: item.title,
          snippet: item.snippet ?? "",
        });
      }
    }

    return results;
  }
}
