import { WeightTemplate } from "../scoring.engine";

export interface MockCategory {
  name: string;
  weightTemplate: WeightTemplate;
  brandKeywords: string[];
}

export interface MockCompany {
  id: string;
  name: string;
  address: string;
  categoryTags: string[];
  website?: string;
  phone?: string;
  source: "inbound" | "outbound";
  discoveryDate?: string;
  revenueBand?: string;
  employeeCountBand?: string;
  storeCount?: number;
  hasEcommerce: boolean;
  mockWebsiteContent?: string;
}

export interface MockSignal {
  id: string;
  companyId: string;
  type:
    | "expansion"
    | "hiring"
    | "new_ecommerce"
    | "competitor_brand_sold"
    | "funding"
    | "trade_show"
    | "store_locator_present"
    | "wholesale_page"
    | "premium_segment"
    | "import_business"
    | "multiple_locations";
  detectedDate: string;
  sourceUrl?: string;
  pointValue: number;
  description: string;
}

export const SEED_CATEGORIES: MockCategory[] = [
  {
    name: "sportswear",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.20,
      competitorPresence: 0.25,
      storeCount: 0.05,
      buyingSignals: 0.10,
      websiteQuality: 0.10,
    },
    brandKeywords: ["Nike", "Adidas", "Under Armour", "Puma", "Lululemon", "Reebok", "Gymshark"],
  },
  {
    name: "footwear",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.20,
      competitorPresence: 0.25,
      storeCount: 0.05,
      buyingSignals: 0.10,
      websiteQuality: 0.10,
    },
    brandKeywords: ["Nike", "Adidas", "Converse", "Vans", "Birkenstock", "Timberland", "New Balance", "Puma"],
  },
  {
    name: "luxury",
    weightTemplate: {
      categoryFit: 0.25,
      geography: 0.05,
      brandMatch: 0.15,
      competitorPresence: 0.30,
      storeCount: 0.05,
      buyingSignals: 0.05,
      websiteQuality: 0.15,
    },
    brandKeywords: ["Gucci", "Prada", "Louis Vuitton", "Chanel", "Rolex", "Hermes", "Balenciaga", "Cartier"],
  },
  {
    name: "outdoor",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["Patagonia", "The North Face", "Columbia", "Arc'teryx", "Yeti", "Osprey", "Marmot"],
  },
  {
    name: "kitchen",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["KitchenAid", "Le Creuset", "Cuisinart", "Instant Pot", "Keurig", "Ninja", "Breville", "T-fal"],
  },
  {
    name: "toys",
    weightTemplate: {
      categoryFit: 0.15,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.10,
      storeCount: 0.20,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["LEGO", "Hasbro", "Mattel", "Fisher-Price", "Nerf", "Barbie", "Hot Wheels", "Play-Doh"],
  },
  {
    name: "fashion",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["Zara", "H&M", "Levi's", "Calvin Klein", "Ralph Lauren", "Tommy Hilfiger", "ASOS", "Gap"],
  },
  {
    name: "beauty",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["Sephora", "Estée Lauder", "L'Oréal", "Fenty Beauty", "MAC", "Clinique", "Shiseido", "Ulta"],
  },
  {
    name: "accessories",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["Ray-Ban", "Oakley", "Coach", "Michael Kors", "Herschel", "Samsonite", "Fossil", "Kate Spade"],
  },
  {
    name: "electronics",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["Apple", "Samsung", "Sony", "Bose", "JBL", "Sonos", "Sennheiser", "Logitech"],
  },
  {
    name: "home",
    weightTemplate: {
      categoryFit: 0.20,
      geography: 0.10,
      brandMatch: 0.15,
      competitorPresence: 0.15,
      storeCount: 0.10,
      buyingSignals: 0.10,
      websiteQuality: 0.20,
    },
    brandKeywords: ["IKEA", "West Elm", "Pottery Barn", "Dyson", "Crate & Barrel", "Wayfair", "Target", "HomeDepot"],
  },
];

export function generateMockCompanies(): MockCompany[] {
  const companies: MockCompany[] = [];
  const cities = [
    { city: "New York", country: "US" },
    { city: "Los Angeles", country: "US" },
    { city: "London", country: "UK" },
    { city: "Manchester", country: "UK" },
    { city: "Toronto", country: "CA" },
    { city: "Sydney", country: "AU" },
    { city: "Berlin", country: "DE" },
    { city: "Paris", country: "FR" },
    { city: "Chicago", country: "US" },
    { city: "Miami", country: "US" },
  ];

  const categoryNames = SEED_CATEGORIES.map((c) => c.name);

  // Generate 120 companies
  for (let i = 1; i <= 120; i++) {
    const cityObj = cities[i % cities.length];
    const source = i % 8 === 0 ? "inbound" : "outbound";
    
    // Pick 1-2 categories
    const primaryCat = categoryNames[i % categoryNames.length];
    const categoryTags = [primaryCat];
    if (i % 5 === 0) {
      const secondaryCat = categoryNames[(i + 3) % categoryNames.length];
      if (secondaryCat !== primaryCat) {
        categoryTags.push(secondaryCat);
      }
    }

    const employeeBands = ["1-10", "11-50", "51-200", "201-500", "500+"];
    const revenueBands = ["< $1M", "$1M - $10M", "$10M - $50M", "> $50M"];
    
    const empBand = employeeBands[i % employeeBands.length];
    const revBand = revenueBands[(i + 1) % revenueBands.length];
    const storeCount = i % 4 === 0 ? 0 : (i % 3 === 0 ? 1 : Math.floor((i * 17) % 85) + 1);
    const hasEcommerce = i % 3 !== 0; // 66% have ecommerce

    const namePrefixes = ["Summit", "Apex", "Nova", "Elite", "Urban", "Prime", "Green", "Legacy", "Velocity", "Core"];
    const nameSuffixes = ["Retailers", "Goods", "Boutique", "Outpost", "Depot", "Stores", "Collective", "Trading", "Global", "Market"];
    const compName = `${namePrefixes[Math.floor((i * 7) % namePrefixes.length)]} ${categoryTags[0].charAt(0).toUpperCase() + categoryTags[0].slice(1)} ${nameSuffixes[Math.floor((i * 11) % nameSuffixes.length)]} ${i}`;

    const domain = compName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
    const website = `https://${domain}`;
    const phone = `+1 (${Math.floor(200 + (i * 3) % 800)}) 555-${String(1000 + i).slice(1)}`;
    const address = `${100 + i} ${cityObj.city} Blvd, ${cityObj.city}, ${cityObj.country}`;

    // Construct mock website text containing brand keywords for the primary category
    const catObj = SEED_CATEGORIES.find((c) => c.name === primaryCat)!;
    const kwToInject = catObj.brandKeywords.slice(0, (i % 4) + 1).join(", ");
    const mockWebsiteContent = `Welcome to our shop! We carry premium brands including ${kwToInject}. Discover the best options in ${primaryCat} and related accessories today. We have physical shops in ${cityObj.city} as well as full e-commerce support.`;

    companies.push({
      id: `company-uuid-${i}`,
      name: compName,
      address,
      categoryTags,
      website,
      phone,
      source: source as "inbound" | "outbound",
      discoveryDate: new Date(Date.now() - (i % 15) * 24 * 60 * 60 * 1000).toISOString(),
      revenueBand: revBand,
      employeeCountBand: empBand,
      storeCount,
      hasEcommerce,
      mockWebsiteContent,
    });
  }

  return companies;
}

export function generateMockSignals(companies: MockCompany[]): MockSignal[] {
  const signals: MockSignal[] = [];
  const signalTypes: Array<MockSignal["type"]> = ["expansion", "hiring", "new_ecommerce", "competitor_brand_sold", "funding", "trade_show"];
  const descriptions: Record<string, string> = {
    expansion: "Announced opening a new regional warehouse and storefront location.",
    hiring: "Currently recruiting a Senior Retail Buyer and Procurement Manager.",
    new_ecommerce: "Launched brand-new digital B2B ordering portal on Shopify Plus.",
    competitor_brand_sold: "Adding competitive brands to their active collections.",
    funding: "Secured Series A funding to expand physical retail footprints.",
    trade_show: "Registered as a high-volume buyer for the upcoming Spring Trade Show.",
    store_locator_present: "Published a store locator on their website to highlight physical retail availability.",
    wholesale_page: "Added or refreshed a wholesale information page for B2B buyers.",
    premium_segment: "Highlighted a premium or high-end product segment in recent merchandising updates.",
    import_business: "Showcased import and sourcing capabilities that suggest international procurement activity.",
    multiple_locations: "Referenced multiple physical retail or distribution locations in current site content.",
  };

  const pointValues: Record<string, number> = {
    expansion: 30,
    hiring: 20,
    new_ecommerce: 20,
    competitor_brand_sold: 25,
    funding: 25,
    trade_show: 15,
    store_locator_present: 18,
    wholesale_page: 16,
    premium_segment: 20,
    import_business: 22,
    multiple_locations: 19,
  };

  companies.forEach((comp, index) => {
    // Generate 1-2 signals per company
    const signalCount = (index % 2) + 1;
    for (let s = 0; s < signalCount; s++) {
      const type = signalTypes[(index + s) % signalTypes.length];
      const daysAgo = (index * s * 3) % 240; // up to 240 days ago for decay demonstration
      const detectedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      
      signals.push({
        id: `signal-uuid-${index}-${s}`,
        companyId: comp.id,
        type,
        detectedDate,
        sourceUrl: `${comp.website}/news/signal-${s}`,
        pointValue: pointValues[type],
        description: `${descriptions[type]} (Detected ${daysAgo} days ago)`,
      });
    }
  });

  return signals;
}
