import { DiscoveryProvider, DiscoveredCompany } from "./provider.interface";

/**
 * GooglePlacesProvider — discovers companies using the Google Places Text Search API.
 * Extracted from the legacy DiscoveryEngine.discoverPlaces() for clean provider separation.
 * Falls back to mock if GOOGLE_PLACES_API_KEY is not configured.
 */
export class GooglePlacesProvider implements DiscoveryProvider {
  private readonly apiKey: string | null;

  constructor() {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    this.apiKey = key && key.trim() !== "" ? key.trim() : null;

    if (!this.apiKey) {
      console.warn("[GooglePlacesProvider] GOOGLE_PLACES_API_KEY not configured. Using mock discovery.");
    }
  }

  async search(keywords: string[]): Promise<DiscoveredCompany[]> {
    if (!this.apiKey) {
      return this.mockSearch(keywords);
    }

    const results: DiscoveredCompany[] = [];
    const seen = new Set<string>();
    const query = keywords[0] ?? "sportswear";

    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.status !== "OK") {
        console.warn(`[GooglePlacesProvider] API returned: ${data.status}`);
        return this.mockSearch(keywords);
      }

      const placeResults = await Promise.allSettled(
        data.results.slice(0, 10).map(async (place: any) => {
          try {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website&key=${this.apiKey}`;
            const detailRes = await fetch(detailUrl);
            const detailData = await detailRes.json();
            const detail = detailData.result ?? {};

            const domain = detail.website ? this.extractDomain(detail.website) : null;
            if (domain && seen.has(domain)) return null;
            if (domain) seen.add(domain);

            return {
              name: detail.name || place.name,
              website: detail.website,
              title: detail.name || place.name,
              snippet: place.formatted_address ?? "",
            } as DiscoveredCompany;
          } catch {
            return {
              name: place.name,
              website: undefined,
              title: place.name,
              snippet: place.formatted_address ?? "",
            } as DiscoveredCompany;
          }
        })
      );

      for (const settled of placeResults) {
        if (settled.status === "fulfilled" && settled.value) {
          results.push(settled.value);
        }
      }
    } catch (err) {
      console.error("[GooglePlacesProvider] API call failed:", err);
      return this.mockSearch(keywords);
    }

    return results;
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
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
        snippet: `Top-rated store matching query: ${keywordText}. Wholesale inquiries welcome.`,
      };
    });
  }
}

