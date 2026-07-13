import { DiscoveryProvider, DiscoveredCompanyInput } from "./provider.interface";
import { IcpRawInput } from "../../types/icp";
import { IcpExpansionResult } from "../services/ai.service";

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

  async search(
    rawInput: IcpRawInput,
    expandedProfile: IcpExpansionResult
  ): Promise<DiscoveredCompanyInput[]> {
    if (!this.apiKey) {
      return this.mockSearch(rawInput, expandedProfile);
    }

    const results: DiscoveredCompanyInput[] = [];
    const seen = new Set<string>();

    // Use the first search variant as query
    const query = expandedProfile.searchVariants[0] ?? `${rawInput.industry} store in ${rawInput.country}`;
    const fullQuery = `${query} ${rawInput.country}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(fullQuery)}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.status !== "OK") {
        console.warn(`[GooglePlacesProvider] API returned: ${data.status}`);
        return this.mockSearch(rawInput, expandedProfile);
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
              description: `${place.name} located at ${place.formatted_address ?? "Unknown"}`,
              snippet: place.formatted_address ?? "",
              country: rawInput.country,
              source: "google_places",
              rawPayload: { place, detail },
            } as DiscoveredCompanyInput;
          } catch {
            return {
              name: place.name,
              website: undefined,
              description: `${place.name} — ${place.formatted_address ?? ""}`,
              snippet: place.formatted_address ?? "",
              country: rawInput.country,
              source: "google_places",
              rawPayload: { place },
            } as DiscoveredCompanyInput;
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
      return this.mockSearch(rawInput, expandedProfile);
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
    ];

    return brands.map((b, i) => {
      const compName = `${b.name} ${rawInput.industry} ${b.suffix}`;
      const domain = compName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
      return {
        name: compName,
        website: `https://${domain}`,
        description: `${compName} is a premium ${rawInput.industry} retailer in ${rawInput.country}.`,
        snippet: `Top-rated ${rawInput.industry} store in ${rawInput.country}. Wholesale inquiries welcome.`,
        country: rawInput.country,
        source: "google_places_mock",
        rawPayload: { mock: true, index: i },
      };
    });
  }
}
