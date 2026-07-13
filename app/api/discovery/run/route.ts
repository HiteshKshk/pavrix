import { NextRequest } from "next/server";
import { PipelineService } from "@/lib/services/pipeline.service";
import { handleRouteError } from "@/lib/errors";
import { IcpRawInput } from "@/types/icp";

/**
 * POST /api/discovery/run
 *
 * Accepts the new ICP-driven input shape:
 * { product, brand, country, targetCustomer, keywords, discoveryProvider? }
 *
 * Also accepts legacy { csvContent } for CSV ingestion (backward compat).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Legacy CSV Ingestion ───────────────────────────────────────────────
    if (body.csvContent && body.csvContent.trim() !== "") {
      const { DiscoveryEngine } = await import("@/lib/discovery.engine");
      const discoveredLeads = DiscoveryEngine.parseCSV(body.csvContent);
      if (discoveredLeads.length === 0) {
        return Response.json(
          { success: false, error: { message: "No valid leads parsed from CSV. Ensure columns 'name' and 'address' exist." } },
          { status: 400 }
        );
      }

      const { PipelineService: PS } = await import("@/lib/services/pipeline.service");
      const results = await PS.ingestLeads(discoveredLeads, "outbound");
      return Response.json({
        success: true,
        data: { totalProcessed: discoveredLeads.length, results },
      });
    }

    // ── ICP-Driven Flow ───────────────────────────────────────────────────
    const { product, brand, country, targetCustomer, keywords, discoveryProvider } = body;

    if (!product || !country) {
      return Response.json(
        { success: false, error: { message: "Required fields: product, country" } },
        { status: 400 }
      );
    }

    const rawInput: IcpRawInput = {
      companyName: brand ?? "Pavrix",
      productDescription: product,
      industry: targetCustomer ?? product,
      country: country,
      targetMarket: "All",
      businessTypes: ["retailer", "distributor", "wholesaler"],
      employeeRange: "11-50",
      keywords: Array.isArray(keywords) ? keywords : (keywords ?? "").split(",").map((k: string) => k.trim()).filter(Boolean),
    };

    // Run pipeline and collect all results (non-streaming for simplicity)
    // The SSE endpoint (/api/discovery/stream) is used for real-time progress
    const results: any[] = [];
    let finalResult: any = null;

    for await (const progress of PipelineService.runIcpPipeline(rawInput, discoveryProvider)) {
      if (progress.stage === "complete") {
        finalResult = progress;
      }
      // Could also push to Redis/memory for SSE polling
    }

    return Response.json({
      success: true,
      data: {
        searchId: finalResult?.searchId,
        totalProcessed: finalResult?.results?.length ?? 0,
        qualified: finalResult?.results?.filter((r: any) => r.qualified).length ?? 0,
        results: finalResult?.results ?? [],
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
