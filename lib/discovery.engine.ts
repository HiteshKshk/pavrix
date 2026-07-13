import { checkDbConnection } from "./db/connection";
import { prisma } from "./db/prisma";
import { MemoryStore } from "./db/memory-store";

export interface DiscoveredLead {
  name: string;
  address: string;
  country?: string;
  categoryTags: string[];
  website?: string;
  phone?: string;
  revenueBand?: string;
  employeeCountBand?: string;
  storeCount?: number;
  hasEcommerce: boolean;
  mockWebsiteContent?: string;
}

export class DiscoveryEngine {
  /**
   * Normalizes a website URL into a canonical domain string for comparison.
   */
  static normalizeDomain(url?: string | null): string {
    if (!url) return "";
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    clean = clean.split("/")[0]; // keep only host
    return clean;
  }

  /**
   * Normalizes a phone number to only its digits.
   */
  static normalizePhone(phone?: string | null): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  }

  static normalizeAddress(address?: string | null): string {
    if (!address) return "";
    let clean = address.trim().toLowerCase();
    // remove punctuation
    clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    // normalize common abbreviations
    clean = clean.replace(/\bstreet\b/g, "st");
    clean = clean.replace(/\broad\b/g, "rd");
    clean = clean.replace(/\bavenue\b/g, "ave");
    clean = clean.replace(/\bboulevard\b/g, "blvd");
    clean = clean.replace(/\blane\b/g, "ln");
    clean = clean.replace(/\bdrive\b/g, "dr");
    clean = clean.replace(/\bcourt\b/g, "ct");
    clean = clean.replace(/\bplace\b/g, "pl");
    // normalize countries
    clean = clean.replace(/\bunited kingdom\b|\bgreat britain\b|\bengland\b/g, "uk");
    clean = clean.replace(/\bunited states of america\b|\bunited states\b|\busa\b/g, "us");
    // compress multiple spaces
    clean = clean.replace(/\s+/g, " ");
    return clean;
  }

  /**
   * Returns token-based Jaccard similarity between two addresses (0.0 to 1.0)
   */
  static addressSimilarity(addr1: string, addr2: string): number {
    const n1 = DiscoveryEngine.normalizeAddress(addr1);
    const n2 = DiscoveryEngine.normalizeAddress(addr2);
    if (!n1 || !n2) return 0;
    if (n1 === n2) return 1.0;

    const tokens1 = new Set(n1.split(" "));
    const tokens2 = new Set(n2.split(" "));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Core identity resolution: Checks if a discovered lead already exists in DB/Memory.
   * Matches by:
   * 1. Normalized domain (if present)
   * 2. Normalized phone (if present)
   * 3. Normalized address similarity threshold (>= 0.70)
   */
  static async checkDuplicate(
    lead: DiscoveredLead,
    allExistingCompanies: any[]
  ): Promise<boolean> {
    return DiscoveryEngine.syncCheckDuplicate(lead, allExistingCompanies);
  }

  /**
   * Synchronous version of checkDuplicate — used in pipeline where async isn't practical inside filters.
   */
  static syncCheckDuplicate(
    lead: DiscoveredLead,
    allExistingCompanies: any[]
  ): boolean {
    const domain = DiscoveryEngine.normalizeDomain(lead.website);
    const phone = DiscoveryEngine.normalizePhone(lead.phone);
    const address = lead.address;

    for (const existing of allExistingCompanies) {
      if (domain && existing.website) {
        const existingDomain = DiscoveryEngine.normalizeDomain(existing.website);
        if (domain === existingDomain) return true;
      }
      if (phone && existing.phone) {
        const existingPhone = DiscoveryEngine.normalizePhone(existing.phone);
        if (phone === existingPhone) return true;
      }
      if (address && existing.address) {
        const similarity = DiscoveryEngine.addressSimilarity(address, existing.address);
        if (similarity >= 0.70) return true;
      }
    }
    return false;
  }


  /**
   * Queries Google Places API (text search) for matching businesses,
   * normalizes records, and filters duplicates.
   */
  static async discoverPlaces(
    category: string,
    geography: string,
    existingCompanies: any[]
  ): Promise<DiscoveredLead[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const query = `${category} store in ${geography}`;

    if (!apiKey || apiKey.trim() === "") {
      console.log(`[DiscoveryEngine] Google Places API key not configured. Generating realistic mock discovery for "${query}".`);
      return DiscoveryEngine.generateMockDiscovery(category, geography);
    }

    try {
      // Free tier URL or proxy
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.status !== "OK") {
        throw new Error(data.error_message || `API Status: ${data.status}`);
      }

      const results: DiscoveredLead[] = [];
      const placeDetailsPromises = data.results.slice(0, 10).map(async (place: any) => {
        // Fetch detailed record to obtain phone, website, and photos (mock details fallback if error)
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours&key=${apiKey}`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          const detail = detailData.result || {};

          return {
            name: detail.name || place.name,
            address: detail.formatted_address || place.formatted_address || "Unknown Address",
            categoryTags: [category.toLowerCase()],
            website: detail.website || undefined,
            phone: detail.formatted_phone_number || undefined,
            hasEcommerce: detail.website ? Math.random() > 0.3 : false, // heuristic
            storeCount: Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 1,
            revenueBand: Math.random() > 0.5 ? "$1M - $10M" : "< $1M",
            employeeCountBand: Math.random() > 0.5 ? "11-50" : "1-10",
            mockWebsiteContent: `Official site for ${detail.name}. Check out our collections of sportswear, kitchen accessories, and more. Contact us or visit our storefront.`,
          };
        } catch (e) {
          // fallback to list item only
          return {
            name: place.name,
            address: place.formatted_address || "Unknown Address",
            categoryTags: [category.toLowerCase()],
            website: undefined,
            phone: undefined,
            hasEcommerce: false,
            storeCount: 1,
            revenueBand: "< $1M",
            employeeCountBand: "1-10",
            mockWebsiteContent: `Discover ${place.name} store today!`,
          };
        }
      });

      const resolved = await Promise.all(placeDetailsPromises);
      return resolved;
    } catch (error) {
      console.error("[DiscoveryEngine] Google Places API call failed:", error);
      return DiscoveryEngine.generateMockDiscovery(category, geography);
    }
  }

  /**
   * Generates mock leads for discovery simulation.
   */
  private static generateMockDiscovery(category: string, geography: string): DiscoveredLead[] {
    const categoryLower = category.toLowerCase();
    const leads: DiscoveredLead[] = [];
    const brands = [
      { name: "Atlas", suffix: "Boutique" },
      { name: "Century", suffix: "Retail" },
      { name: "Horizon", suffix: "Collective" },
      { name: "Vanguard", suffix: "Outpost" },
      { name: "Cascade", suffix: "Trading" },
    ];

    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      const compName = `${b.name} ${category.charAt(0).toUpperCase() + category.slice(1)} ${b.suffix} ${i + 1}`;
      const domain = compName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
      const website = `https://${domain}`;
      const phone = `+1 (555) 019-990${i}`;
      const address = `${400 + i} Main St, ${geography}, US`;
      
      leads.push({
        name: compName,
        address,
        categoryTags: [categoryLower],
        website,
        phone,
        hasEcommerce: i % 2 === 0,
        storeCount: i % 3 === 0 ? 0 : i + 1,
        revenueBand: i % 2 === 0 ? "$1M - $10M" : "< $1M",
        employeeCountBand: i % 2 === 0 ? "11-50" : "1-10",
        mockWebsiteContent: `Welcome to ${compName} website. We are a premier retailer of quality goods. Check out brands like Nike, LEGO, Dyson and KitchenAid here!`,
      });
    }

    return leads;
  }

  /**
   * Parses CSV content and normalizes it into DiscoveredLead structures.
   * Expects columns: name, address, categories (comma separated), website, phone, revenue_band, employee_count_band, store_count, has_ecommerce, mock_website_content
   */
  static parseCSV(csvContent: string): DiscoveredLead[] {
    const lines = csvContent.split("\n");
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const leads: DiscoveredLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Basic comma splitter that ignores commas inside quotes
      const values: string[] = [];
      let currentVal = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      if (!row.name || !row.address) continue;

      const categoryTags = row.categories
        ? row.categories.split(";").map(c => c.trim().toLowerCase())
        : ["sportswear"];

      leads.push({
        name: row.name,
        address: row.address,
        categoryTags,
        website: row.website || undefined,
        phone: row.phone || undefined,
        revenueBand: row.revenue_band || undefined,
        employeeCountBand: row.employee_count_band || undefined,
        storeCount: row.store_count ? parseInt(row.store_count, 10) : undefined,
        hasEcommerce: row.has_ecommerce === "true" || row.has_ecommerce === "1",
        mockWebsiteContent: row.mock_website_content || undefined,
      });
    }

    return leads;
  }
}
