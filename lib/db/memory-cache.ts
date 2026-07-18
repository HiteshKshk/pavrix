export interface MemorySerpApiUsage {
  id: string;
  keyword: string;
  results: number;
  timestamp: string;
}

export interface MemorySearchKeyword {
  id: string;
  keyword: string;
  results: any; // DiscoveredCompany[]
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWebsiteContent {
  id: string;
  companyId: string;
  url: string;
  content: string;
  crawledAt: string;
}

let serpApiUsages: MemorySerpApiUsage[] = [];
let searchKeywords = new Map<string, MemorySearchKeyword>();
let websiteContents: MemoryWebsiteContent[] = [];

export const MemoryCache = {
  addSerpApiUsage: (keyword: string, results: number) => {
    const usage: MemorySerpApiUsage = {
      id: `usage-${Date.now()}-${Math.random()}`,
      keyword,
      results,
      timestamp: new Date().toISOString(),
    };
    serpApiUsages.push(usage);
    return usage;
  },

  getMonthlySerpApiUsageCount: (): number => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startMs = startOfMonth.getTime();
    return serpApiUsages.filter(u => new Date(u.timestamp).getTime() >= startMs).length;
  },

  getSearchKeyword: (keyword: string): MemorySearchKeyword | null => {
    return searchKeywords.get(keyword.toLowerCase().trim()) || null;
  },

  setSearchKeyword: (keyword: string, results: any) => {
    const cleanKw = keyword.toLowerCase().trim();
    const now = new Date().toISOString();
    const entry: MemorySearchKeyword = {
      id: `keyword-${Date.now()}`,
      keyword: cleanKw,
      results,
      createdAt: now,
      updatedAt: now,
    };
    searchKeywords.set(cleanKw, entry);
    return entry;
  },

  addWebsiteContent: (companyId: string, url: string, content: string) => {
    const wc: MemoryWebsiteContent = {
      id: `wc-${Date.now()}-${Math.random()}`,
      companyId,
      url,
      content,
      crawledAt: new Date().toISOString(),
    };
    websiteContents.push(wc);
    return wc;
  },

  getWebsiteContentsByCompanyId: (companyId: string): MemoryWebsiteContent[] => {
    return websiteContents.filter(wc => wc.companyId === companyId);
  }
};
