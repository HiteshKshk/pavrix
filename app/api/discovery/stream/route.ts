import { NextRequest } from "next/server";
import { PipelineService } from "@/lib/services/pipeline.service";
import { IcpRawInput } from "@/types/icp";

/**
 * GET /api/discovery/stream
 *
 * Server-Sent Events endpoint that streams real-time pipeline progress.
 * Query params: product, brand, country, targetCustomer, keywords, discoveryProvider
 *
 * Client usage:
 * const es = new EventSource(`/api/discovery/stream?product=Nike&country=Canada&...`);
 * es.onmessage = (e) => { const progress = JSON.parse(e.data); ... }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const product = searchParams.get("product") ?? "";
  const brand = searchParams.get("brand") ?? "Pavrix";
  const country = searchParams.get("country") ?? "";
  const targetCustomer = searchParams.get("targetCustomer") ?? product;
  const keywordsRaw = searchParams.get("keywords") ?? "";
  const discoveryProvider = searchParams.get("discoveryProvider") ?? undefined;

  if (!product || !country) {
    return new Response(
      JSON.stringify({ error: "product and country are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawInput: IcpRawInput = {
    companyName: brand,
    productDescription: product,
    industry: targetCustomer,
    country,
    targetMarket: "All",
    businessTypes: ["retailer", "distributor", "wholesaler"],
    employeeRange: "11-50",
    keywords: keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean),
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        for await (const progress of PipelineService.runIcpPipeline(rawInput, discoveryProvider)) {
          send(progress);
          if (progress.stage === "complete" || progress.stage === "error") {
            break;
          }
        }
      } catch (err) {
        send({ stage: "error", message: String(err), pct: 0 });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
