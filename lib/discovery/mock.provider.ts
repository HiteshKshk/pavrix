import { DiscoveryProvider, DiscoveredCompanyInput } from "./provider.interface";
import { IcpRawInput } from "../../types/icp";
import { IcpExpansionResult } from "../services/ai.service";

const MOCK_COMPANIES = [
  {
    name: "Atlas Sporting Goods",
    website: "https://atlassportinggoods.com",
    description: "Multi-brand sporting goods retailer with 12 locations across Canada. Carries Nike, Adidas, and Under Armour. Active wholesale buyer.",
    snippet: "Premium sporting goods chain with wholesale program — running stores, outdoor gear, athletic footwear.",
    country: "Canada",
  },
  {
    name: "Century Athletic Boutique",
    website: "https://centuryathletic.com",
    description: "Premium athletic boutique focused on running and fitness. 3 locations in Toronto, active e-commerce. Looking to expand brand portfolio.",
    snippet: "Toronto-based athletic boutique. Running shoes, fitness apparel, wholesale inquiries welcome.",
    country: "Canada",
  },
  {
    name: "Horizon Sports Collective",
    website: "https://horizonsportscollective.ca",
    description: "Sports equipment collective serving Ontario retailers. Store locator active. Expanding to Vancouver market.",
    snippet: "Ontario sports collective — outdoor gear, sporting equipment, athletic apparel. Expanding Q2.",
    country: "Canada",
  },
  {
    name: "Vanguard Outdoor Outpost",
    website: "https://vanguardoutdoor.ca",
    description: "Premium outdoor and sportswear retailer with 5 locations. Carries Patagonia, Arc'teryx, and Salomon. Strong wholesale buyer profile.",
    snippet: "Vancouver outdoor specialty retailer. Premium brands, multiple locations, active wholesale buyer.",
    country: "Canada",
  },
  {
    name: "Cascade Running & Trail",
    website: "https://cascaderunning.com",
    description: "Specialist running and trail store with e-commerce. Hiring a new buyer. Carries Brooks, Hoka, and New Balance. Single location, Vancouver.",
    snippet: "Running specialist store — Brooks, Hoka, trail gear. Currently hiring buyer. E-commerce active.",
    country: "Canada",
  },
  {
    name: "Summit Sport & Fitness",
    website: "https://summitsportfitness.ca",
    description: "Multi-sport retailer serving Alberta market. 7 locations, active store locator, wholesale page on site.",
    snippet: "Alberta's leading multi-sport retailer. 7 locations. Wholesale program available.",
    country: "Canada",
  },
];

export class MockDiscoveryProvider implements DiscoveryProvider {
  async search(
    rawInput: IcpRawInput,
    expandedProfile: IcpExpansionResult
  ): Promise<DiscoveredCompanyInput[]> {
    // Return mock companies adapted to the requested country/industry
    return MOCK_COMPANIES.map((company, i) => ({
      name: company.name,
      website: company.website,
      description: company.description,
      snippet: company.snippet,
      country: rawInput.country,
      source: "mock",
      rawPayload: { mock: true, index: i },
    }));
  }
}
