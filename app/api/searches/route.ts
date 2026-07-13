import { NextRequest } from "next/server";
import { SearchRepository } from "@/lib/repositories/search.repository";
import { handleRouteError } from "@/lib/errors";

/**
 * GET /api/searches
 * Returns recent ICP searches for the "Recent Searches" dashboard metric.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    const searches = await SearchRepository.listRecent(limit);

    return Response.json({
      success: true,
      data: searches.map((s: any) => ({
        id: s.id,
        rawInput: s.rawInput,
        status: s.status,
        totalFound: s.totalFound,
        qualifiedCount: s.qualifiedCount,
        createdAt: s.createdAt,
        resultCount: s._count?.results ?? 0,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
