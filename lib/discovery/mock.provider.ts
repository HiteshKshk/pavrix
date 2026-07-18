import { DiscoveryProvider, DiscoveredCompany } from "./provider.interface";

const MOCK_COMPANIES = [
  {
    name: "Atlas Sporting Goods",
    website: "https://atlassportinggoods.com",
    snippet: "Premium sporting goods chain with wholesale program — running stores, outdoor gear, athletic footwear.",
  },
  {
    name: "Century Athletic Boutique",
    website: "https://centuryathletic.com",
    snippet: "Toronto-based athletic boutique. Running shoes, fitness apparel, wholesale inquiries welcome.",
  },
  {
    name: "Horizon Sports Collective",
    website: "https://horizonsportscollective.ca",
    snippet: "Ontario sports collective — outdoor gear, sporting equipment, athletic apparel. Expanding Q2.",
  },
  {
    name: "Vanguard Outdoor Outpost",
    website: "https://vanguardoutdoor.ca",
    snippet: "Vancouver outdoor specialty retailer. Premium brands, multiple locations, active wholesale buyer.",
  },
  {
    name: "Cascade Running & Trail",
    website: "https://cascaderunning.com",
    snippet: "Running specialist store — Brooks, Hoka, trail gear. Currently hiring buyer. E-commerce active.",
  },
  {
    name: "Summit Sport & Fitness",
    website: "https://summitsportfitness.ca",
    snippet: "Alberta's leading multi-sport retailer. 7 locations. Wholesale program available.",
  },
  {
    name: "Apex Outdoors",
    website: "https://apexoutdoors.ca",
    snippet: "Premier outdoor and gear shop with multiple storefronts and trade partnerships.",
  },
  {
    name: "Summit Peak Outfitters",
    website: "https://summitpeakoutfitters.com",
    snippet: "High-end mountain climbing and trail gear retailer. Wholesale account options active.",
  },
  {
    name: "Velo & Trail Collective",
    website: "https://velotrailcollective.com",
    snippet: "Specialty cycles, activewear, and hiking footwear outlet. Multi-location physical presence.",
  },
  {
    name: "Latitude Lifestyle Goods",
    website: "https://latitudelifestyle.com",
    snippet: "Curated lifestyle and sportswear accessories supplier. E-commerce and catalog ordering open.",
  },
  {
    name: "Solstice Active Gear",
    website: "https://solsticeactive.ca",
    snippet: "Activewear, yoga, and athletic apparel chain. Store finder page and contact forms active.",
  },
  {
    name: "Pinnacle Sports Exchange",
    website: "https://pinnaclesportsexchange.com",
    snippet: "Quality sporting goods buying group. Active wholesale dealer locator on website.",
  },
];

export class MockDiscoveryProvider implements DiscoveryProvider {
  async search(keywords: string[]): Promise<DiscoveredCompany[]> {
    const randomSuffix = Math.floor(Math.random() * 900) + 100; // e.g. 128
    return MOCK_COMPANIES.map((company) => {
      const name = `${company.name} ${randomSuffix}`;
      const parsedUrl = new URL(company.website);
      const hostParts = parsedUrl.hostname.split(".");
      const newDomain = `${hostParts[0]}${randomSuffix}.${hostParts[1]}`;
      const website = `https://${newDomain}`;

      return {
        name,
        website,
        title: name,
        snippet: company.snippet,
      };
    });
  }
}

