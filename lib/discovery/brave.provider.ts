import { DiscoveryProvider, DiscoveredCompany } from "./provider.interface";

/**
 * BraveSearchProvider — discovers companies using the Brave Search API.
 * Falls back to mock if BRAVE_API_KEY is not set.
 *
 * Brave Search API docs: https://api.search.brave.com/app/documentation/web-search/query
 */
export class BraveSearchProvider implements DiscoveryProvider {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.search.brave.com/res/v1/web/search";

  constructor() {
    const key = process.env.BRAVE_API_KEY;
    this.apiKey = key && key.trim() !== "" ? key.trim() : null;

    if (!this.apiKey) {
      console.warn("[BraveSearchProvider] BRAVE_API_KEY not configured. Using mock discovery.");
    }
  }

  async search(keywords: string[]): Promise<DiscoveredCompany[]> {
    if (!this.apiKey) {
      return this.mockSearch(keywords);
    }

    const results: DiscoveredCompany[] = [];
    const seen = new Set<string>();
    const queries = keywords.slice(0, 5);

    for (const query of queries) {
      try {
        const url = new URL(this.baseUrl);
        url.searchParams.set("q", query);
        url.searchParams.set("count", "10");
        url.searchParams.set("search_lang", "en");
        url.searchParams.set("text_decorations", "false");

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": this.apiKey,
          },
        });

        if (!response.ok) {
          console.warn(`[BraveSearchProvider] Query "${query}" returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const webResults = data.web?.results ?? [];

        for (const result of webResults) {
          const domain = this.extractDomain(result.url);
          if (!domain || seen.has(domain)) continue;
          seen.add(domain);

          results.push({
            name: result.title ?? domain,
            website: result.url,
            title: result.title ?? domain,
            snippet: result.description ?? "",
          });
        }
      } catch (err) {
        console.error(`[BraveSearchProvider] Search query failed:`, err);
      }
    }

    return results;
  }

  private extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  private mockSearch(keywords: string[]): DiscoveredCompany[] {
    const brands = [
      { name: "Atlas", suffix: "Sports" },
      { name: "Century", suffix: "Retail" },
      { name: "Horizon", suffix: "Collective" },
      { name: "Vanguard", suffix: "Outpost" },
      { name: "Cascade", suffix: "Trading" },
      { name: "Summit", suffix: "Boutique" },
      { name: "Apex", suffix: "Outdoors" },
      { name: "Summit Peak", suffix: "Outfitters" },
      { name: "Velo & Trail", suffix: "Collective" },
      { name: "Latitude", suffix: "Lifestyle" },
      { name: "Solstice", suffix: "Active" },
      { name: "Pinnacle", suffix: "Exchange" },
    ];

    const keywordText = keywords[0] ?? "sportswear";
    const randomSuffix = Math.floor(Math.random() * 900) + 100;

    return brands.map((b) => {
      const compName = `${b.name} ${b.suffix} ${randomSuffix}`;
      const domain = `${b.name.toLowerCase().replace(/[^a-z0-9]/g, "")}${b.suffix.toLowerCase().replace(/[^a-z0-9]/g, "")}${randomSuffix}.com`;
      return {
        name: compName,
        website: `https://${domain}`,
        title: compName,
        snippet: `Premium retailer matching query: ${keywordText}. Carrying top brands and serving wholesale buyers.`,
      };
    });
  }
}

