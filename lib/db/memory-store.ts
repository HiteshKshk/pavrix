import { 
  SEED_CATEGORIES, 
  generateMockCompanies, 
  generateMockSignals, 
  MockCompany, 
  MockSignal 
} from "./mock-data";
import { ScoringEngine, ScoringResult } from "../scoring.engine";

// Memory storage instances
let categories = [...SEED_CATEGORIES];
let companies: MockCompany[] = [];
let signals: MockSignal[] = [];
let scores: Array<{
  id: string;
  companyId: string;
  categoryName: string;
  totalScore: number;
  breakdown: any;
  scoreVersion: string;
  computedAt: string;
}> = [];

let outreachList: Array<{
  id: string;
  companyId: string;
  draftText: string;
  status: "drafted" | "approved" | "sent";
  signalsReferenced: string[];
  createdAt: string;
  updatedAt: string;
}> = [];

let leadsInbound: Array<{
  id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  categoryName?: string;
  revenueBand?: string;
  employeeCountBand?: string;
  storeCount?: number;
  hasEcommerce: boolean;
  contactEmail?: string;
  message?: string;
  submittedAt: string;
  processed: boolean;
}> = [];

// Track mock embeddings (1536 dims)
const mockEmbeddings: Record<string, number[]> = {};

// Helper to generate a deterministic unit vector from a string
function getDeterministicEmbedding(input: string): number[] {
  const vector = new Array(1536).fill(0);
  // Simple hash function to seed the values
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Fill vector
  let mag = 0;
  for (let i = 0; i < 1536; i++) {
    const val = Math.sin(hash + i);
    vector[i] = val;
    mag += val * val;
  }
  
  // Normalize
  const magnitude = Math.sqrt(mag);
  for (let i = 0; i < 1536; i++) {
    vector[i] = vector[i] / magnitude;
  }
  
  return vector;
}

// Compute dot product of two normalized vectors (cosine similarity)
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < 1536; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// Initialize memory store
export function initMemoryStore() {
  if (companies.length > 0) return; // already initialized
  
  console.log("[MemoryStore] Initializing in-memory mock records...");
  const rawComps = generateMockCompanies();
  const rawSigs = generateMockSignals(rawComps);
  
  companies = rawComps;
  signals = rawSigs;
  
  // Generate embeddings for all companies
  companies.forEach((c) => {
    mockEmbeddings[c.id] = getDeterministicEmbedding(c.name + " " + (c.mockWebsiteContent || ""));
  });

  // Calculate scores for all companies
  companies.forEach((comp) => {
    const compSignals = signals.filter((s) => s.companyId === comp.id);
    
    // Score against each of the company's category tags
    comp.categoryTags.forEach((catName) => {
      const catObj = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      const brandKws = catObj ? catObj.brandKeywords : [];
      const weights = catObj ? catObj.weightTemplate : undefined;
      
      const scoringResult = ScoringEngine.computeScore(
        comp,
        compSignals,
        catName,
        brandKws,
        weights,
        comp.mockWebsiteContent
      );
      
      scores.push({
        id: `score-uuid-${comp.id}-${catName}`,
        companyId: comp.id,
        categoryName: catName,
        totalScore: scoringResult.totalScore,
        breakdown: scoringResult.breakdown,
        scoreVersion: scoringResult.scoreVersion,
        computedAt: new Date().toISOString(),
      });
    });
  });

  // Generate some mock outreach drafts for qualified companies (score >= 60)
  companies.forEach((comp) => {
    const bestScore = getBestScoreForCompany(comp.id);
    if (bestScore && bestScore.totalScore >= 60) {
      const compSignals = signals.filter((s) => s.companyId === comp.id).slice(0, 2);
      const sigTypes = compSignals.map((s) => s.type);
      
      outreachList.push({
        id: `outreach-uuid-${comp.id}`,
        companyId: comp.id,
        draftText: `Hi Team,\n\nI noticed ${comp.name} recently experienced a buying signal: ${compSignals[0]?.description || "growing retail presence"}. As a premier wholesale distributor, Pavrix would love to supply you with top authentic brands in ${comp.categoryTags.join(" and ")}.\n\nLet's connect!\n\nBest regards,\nPavrix Sales`,
        status: "drafted",
        signalsReferenced: sigTypes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  console.log(`[MemoryStore] Successfully seeded: ${categories.length} categories, ${companies.length} companies, ${signals.length} signals, ${scores.length} scores, and ${outreachList.length} outreach drafts in-memory.`);
}

export function getBestScoreForCompany(companyId: string) {
  const compScores = scores.filter((s) => s.companyId === companyId);
  if (compScores.length === 0) return null;
  return compScores.reduce((best, s) => (s.totalScore > best.totalScore ? s : best), compScores[0]);
}

// Export database accessors
export const MemoryStore = {
  getCategories: () => {
    return categories;
  },
  
  getCompanies: () => {
    initMemoryStore();
    return companies;
  },
  
  getCompany: (id: string) => {
    initMemoryStore();
    return companies.find((c) => c.id === id) || null;
  },
  
  addCompany: (comp: Omit<MockCompany, "id"> & { id?: string }) => {
    initMemoryStore();
    const newId = comp.id || `company-uuid-gen-${Date.now()}`;
    const newComp: MockCompany = {
      ...comp,
      id: newId,
      discoveryDate: comp.discoveryDate || new Date().toISOString(),
    };
    companies.push(newComp);
    mockEmbeddings[newId] = getDeterministicEmbedding(newComp.name + " " + (newComp.mockWebsiteContent || ""));
    return newComp;
  },
  
  getSignals: (companyId: string) => {
    initMemoryStore();
    return signals.filter((s) => s.companyId === companyId);
  },
  
  addSignal: (sig: Omit<MockSignal, "id">) => {
    initMemoryStore();
    const newSig: MockSignal = {
      ...sig,
      id: `signal-uuid-gen-${Date.now()}-${Math.random()}`,
    };
    signals.push(newSig);
    return newSig;
  },
  
  getScores: (companyId: string) => {
    initMemoryStore();
    return scores.filter((s) => s.companyId === companyId);
  },
  
  addScore: (score: Omit<typeof scores[0], "id" | "computedAt">) => {
    initMemoryStore();
    const newScore = {
      ...score,
      id: `score-uuid-gen-${Date.now()}`,
      computedAt: new Date().toISOString(),
    };
    
    // Remove existing score for this company/category combination
    scores = scores.filter((s) => !(s.companyId === score.companyId && s.categoryName === score.categoryName));
    scores.push(newScore);
    return newScore;
  },
  
  getOutreach: (companyId: string) => {
    initMemoryStore();
    return outreachList.filter((o) => o.companyId === companyId);
  },
  
  addOutreach: (outreach: Omit<typeof outreachList[0], "id" | "createdAt" | "updatedAt">) => {
    initMemoryStore();
    const newOutreach = {
      ...outreach,
      id: `outreach-uuid-gen-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    outreachList.push(newOutreach);
    return newOutreach;
  },
  
  updateOutreach: (id: string, draftText: string, status: "drafted" | "approved" | "sent") => {
    initMemoryStore();
    const outreach = outreachList.find((o) => o.id === id);
    if (outreach) {
      outreach.draftText = draftText;
      outreach.status = status;
      outreach.updatedAt = new Date().toISOString();
      return outreach;
    }
    return null;
  },
  
  getLeadsInbound: () => {
    return leadsInbound;
  },
  
  addLeadInbound: (lead: Omit<typeof leadsInbound[0], "id" | "submittedAt" | "processed">) => {
    const newLead = {
      ...lead,
      id: `inbound-uuid-gen-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      processed: false,
    };
    leadsInbound.push(newLead);
    return newLead;
  },
  
  updateLeadInboundProcessed: (id: string) => {
    const lead = leadsInbound.find((l) => l.id === id);
    if (lead) {
      lead.processed = true;
      return lead;
    }
    return null;
  },

  findSimilarCompanies: (companyId: string, limit = 5): Array<MockCompany & { similarity: number }> => {
    initMemoryStore();
    const targetEmbedding = mockEmbeddings[companyId];
    if (!targetEmbedding) return [];

    const similarities = companies
      .filter((c) => c.id !== companyId)
      .map((c) => {
        const emb = mockEmbeddings[c.id];
        const sim = emb ? cosineSimilarity(targetEmbedding, emb) : 0;
        return {
          ...c,
          similarity: Math.round(sim * 100) / 100,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }
};
