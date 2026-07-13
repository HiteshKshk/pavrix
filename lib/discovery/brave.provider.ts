import { DiscoveryProvider, DiscoveredCompanyInput } from "./provider.interface";
import { IcpRawInput } from "../../types/icp";
import { IcpExpansionResult } from "../services/ai.service";

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

  async search(
    rawInput: IcpRawInput,
    expandedProfile: IcpExpansionResult
  ): Promise<DiscoveredCompanyInput[]> {
    if (!this.apiKey) {
      return this.mockSearch(rawInput, expandedProfile);
    }

    const results: DiscoveredCompanyInput[] = [];
    const seen = new Set<string>();

    // Build search queries from the expanded ICP variants
    const queries = expandedProfile.searchVariants.slice(0, 5);

    for (const query of queries) {
      try {
        const searchQuery = `${query} ${rawInput.country}`;
        const url = new URL(this.baseUrl);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("count", "10");
        url.searchParams.set("country", this.countryCodeMap(rawInput.country));
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
          console.warn(`[BraveSearchProvider] Query "${searchQuery}" returned ${response.status}`);
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
            description: result.description ?? "",
            snippet: result.description ?? "",
            country: rawInput.country,
            source: "brave_search",
            rawPayload: result,
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

  private countryCodeMap(country: string): string {
    const map: Record<string, string> = {
      "United States": "us",
      "United Kingdom": "gb",
      Canada: "ca",
      Australia: "au",
      Germany: "de",
      France: "fr",
      India: "in",
    };
    const lower = country.toLowerCase();
    for (const [name, code] of Object.entries(map)) {
      if (lower.includes(name.toLowerCase()) || lower.includes(code)) {
        return code;
      }
    }
    return "us";
  }

  private mockSearch(
    rawInput: IcpRawInput,
    expandedProfile: IcpExpansionResult
  ): DiscoveredCompanyInput[] {
    const brands = [
      { name: "Atlas", suffix: "Sports" },
      { name: "Century", suffix: "Retail" },
      { name: "Horizon", suffix: "Collective" },
      { name: "Vanguard", suffix: "Outpost" },
      { name: "Cascade", suffix: "Trading" },
      { name: "Summit", suffix: "Boutique" },
    ];

    return brands.map((b, i) => {
      const compName = `${b.name} ${rawInput.industry} ${b.suffix}`;
      const domain = compName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
      return {
        name: compName,
        website: `https://${domain}`,
        description: `${compName} is a ${expandedProfile.targetCompanies[0] ?? "retail"} based in ${rawInput.country}, specializing in ${rawInput.productDescription}.`,
        snippet: `Premium ${rawInput.industry} retailer in ${rawInput.country}. Carrying top brands and serving wholesale buyers.`,
        country: rawInput.country,
        source: "brave_mock",
        rawPayload: { mock: true, index: i },
      };
    });
  }
}
