import { prisma } from "../db/prisma";
import { checkDbConnection } from "../db/connection";
import { IcpRawInput } from "../../types/icp";
import { IcpExpansionResult } from "../services/ai.service";

export interface CreateSearchData {
  rawInput: IcpRawInput;
  expandedProfile: IcpExpansionResult;
  searchVariants: string[];
}

/**
 * SearchRepository — manages IcpSearch records for auditable search history.
 */
export class SearchRepository {
  static async create(data: CreateSearchData): Promise<{ id: string }> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        const record = await (prisma as any).icpSearch.create({
          data: {
            rawInput: data.rawInput as any,
            expandedProfile: data.expandedProfile as any,
            searchVariants: data.searchVariants as any,
            status: "running",
          },
        });
        return { id: record.id };
      } catch (err) {
        console.warn("[SearchRepository] DB create failed:", err);
      }
    }

    // In-memory fallback — generate a UUID
    return { id: `mock-search-${Date.now()}` };
  }

  static async complete(
    id: string,
    totalFound: number,
    qualifiedCount: number
  ): Promise<void> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        await (prisma as any).icpSearch.update({
          where: { id },
          data: { status: "complete", totalFound, qualifiedCount },
        });
      } catch {}
    }
  }

  static async markError(id: string): Promise<void> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        await (prisma as any).icpSearch.update({
          where: { id },
          data: { status: "error" },
        });
      } catch {}
    }
  }

  static async listRecent(limit = 10): Promise<any[]> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await (prisma as any).icpSearch.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: { _count: { select: { results: true } } },
        });
      } catch {}
    }

    return [];
  }

  static async findById(id: string): Promise<any | null> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        return await (prisma as any).icpSearch.findUnique({
          where: { id },
          include: {
            results: {
              include: { company: true },
              orderBy: { rank: "asc" },
            },
          },
        });
      } catch {}
    }

    return null;
  }

  static async linkCompany(
    searchId: string,
    companyId: string,
    rank: number,
    qualified: boolean
  ): Promise<void> {
    const isDbLive = await checkDbConnection();

    if (isDbLive) {
      try {
        await (prisma as any).companySearch.upsert({
          where: { searchId_companyId: { searchId, companyId } },
          create: { searchId, companyId, rank, qualified },
          update: { rank, qualified },
        });
      } catch {}
    }
  }
}
