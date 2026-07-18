import { prisma } from "../db/prisma";
import { checkDbConnection } from "../db/connection";
import { MemoryStore } from "../db/memory-store";

export type LeadStatus =
  | "New"
  | "Qualified"
  | "Contacted"
  | "Meeting"
  | "Won"
  | "Lost"
  | "Archive";

export const LEAD_STATUS_VALUES: LeadStatus[] = [
  "New", "Qualified", "Contacted", "Meeting", "Won", "Lost", "Archive",
];

export interface CreateCompanyData {
  name: string;
  address: string;
  country?: string;
  categoryTags: string[];
  website?: string;
  phone?: string;
  source: "inbound" | "outbound";
  storeCount?: number;
  hasEcommerce?: boolean;
  revenueBand?: string;
  employeeCountBand?: string;
  description?: string;
  aiExplanation?: string;
  decisionMakerTitle?: string;
  crawlData?: any;
  crawledAt?: Date;
  status?: LeadStatus;
}

export interface UpdateCompanyData {
  description?: string;
  aiExplanation?: string;
  decisionMakerTitle?: string;
  crawlData?: any;
  crawledAt?: Date;
  storeCount?: number;
  hasEcommerce?: boolean;
  revenueBand?: string;
  employeeCountBand?: string;
  country?: string;
  notes?: string;
}

/**
 * CompanyRepository — thin typed data access layer wrapping Prisma + MemoryStore fallback.
 * Business logic lives in services; repositories handle only data access.
 */
export class CompanyRepository {
  static extractDomain(url?: string | null): string {
    if (!url) return "";
    try {
      const clean = url.trim().toLowerCase();
      const withHttp = clean.startsWith("http") ? clean : `https://${clean}`;
      return new URL(withHttp).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  static async create(data: CreateCompanyData): Promise<any> {
    const isDbLive = await checkDbConnection();
    const rootDomain = data.website ? CompanyRepository.extractDomain(data.website) : null;

    if (isDbLive) {
      try {
        if (rootDomain) {
          const existing = await prisma.company.findUnique({
            where: { rootDomain }
          });
          if (existing) {
            console.info(`[CompanyRepository] Company with root domain "${rootDomain}" already exists. Mapped to ID: ${existing.id}`);
            return existing;
          }
        }

        return await prisma.company.create({
          data: {
            name: data.name,
            address: data.address,
            country: data.country,
            categoryTags: data.categoryTags,
            website: data.website,
            rootDomain,
            phone: data.phone,
            source: data.source as any,
            storeCount: data.storeCount,
            hasEcommerce: data.hasEcommerce ?? false,
            revenueBand: data.revenueBand,
            employeeCountBand: data.employeeCountBand,
            description: data.description,
            aiExplanation: data.aiExplanation,
            decisionMakerTitle: data.decisionMakerTitle,
            crawlData: data.crawlData,
            crawledAt: data.crawledAt,
            status: data.status ?? "New",
          } as any,
        });
      } catch (err) {
        console.warn("[CompanyRepository] DB create failed, falling back to memory:", err);
      }
    }

    if (rootDomain) {
      const existingInMemory = MemoryStore.getCompanies().find(
        (c) => c.website && CompanyRepository.extractDomain(c.website) === rootDomain
      );
      if (existingInMemory) {
        console.info(`[CompanyRepository] In-memory company with root domain "${rootDomain}" already exists.`);
        return existingInMemory;
      }
    }

    return MemoryStore.addCompany({
      name: data.name,
      address: data.address,
      categoryTags: data.categoryTags,
      website: data.website,
      phone: data.phone,
      source: data.source,
      storeCount: data.storeCount,
      hasEcommerce: data.hasEcommerce ?? false,
      revenueBand: data.revenueBand,
      employeeCountBand: data.employeeCountBand,
    });
  }

  static async update(id: string, data: UpdateCompanyData): Promise<any> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await prisma.company.update({
          where: { id },
          data: {
            description: data.description,
            aiExplanation: data.aiExplanation,
            decisionMakerTitle: data.decisionMakerTitle,
            crawlData: data.crawlData,
            crawledAt: data.crawledAt,
            storeCount: data.storeCount,
            hasEcommerce: data.hasEcommerce,
            revenueBand: data.revenueBand,
            employeeCountBand: data.employeeCountBand,
            country: data.country,
            notes: data.notes,
          } as any,
        });
      } catch (err) {
        console.warn("[CompanyRepository] DB update failed:", err);
      }
    }

    const comp = MemoryStore.getCompany(id);
    if (comp) {
      Object.assign(comp, data);
    }
    return comp;
  }

  static async updateStatus(id: string, status: LeadStatus): Promise<any> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await prisma.company.update({
          where: { id },
          data: { status } as any,
        });
      } catch (err) {
        console.warn("[CompanyRepository] DB status update failed:", err);
      }
    }

    const comp = MemoryStore.getCompany(id);
    if (comp) {
      (comp as any).status = status;
    }
    return comp;
  }

  static async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE companies SET embedding = $1::vector WHERE id = $2`,
          `[${embedding.join(",")}]`,
          id
        );
      } catch (err) {
        console.warn("[CompanyRepository] Embedding update failed:", err);
      }
    }
  }

  static async findAll(): Promise<any[]> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await prisma.company.findMany({
          include: { scores: true, signals: true, outreach: true },
          orderBy: { createdAt: "desc" },
        });
      } catch (err) {
        console.warn("[CompanyRepository] findAll failed, using memory:", err);
      }
    }

    return MemoryStore.getCompanies().map((c) => ({
      ...c,
      scores: MemoryStore.getScores(c.id),
      signals: MemoryStore.getSignals(c.id),
      outreach: MemoryStore.getOutreach(c.id),
    }));
  }

  static async findById(id: string): Promise<any | null> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await prisma.company.findUnique({
          where: { id },
          include: { scores: true, signals: true, outreach: true },
        });
      } catch (err) {
        console.warn("[CompanyRepository] findById failed, using memory:", err);
      }
    }

    const c = MemoryStore.getCompany(id);
    if (!c) return null;
    return {
      ...c,
      scores: MemoryStore.getScores(id),
      signals: MemoryStore.getSignals(id),
      outreach: MemoryStore.getOutreach(id),
    };
  }

  static async updateNotes(id: string, notes: string): Promise<any> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await prisma.company.update({ where: { id }, data: { notes } as any });
      } catch {}
    }

    const comp = MemoryStore.getCompany(id);
    if (comp) (comp as any).notes = notes;
    return comp;
  }
}
