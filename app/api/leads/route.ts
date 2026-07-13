import { NextRequest } from "next/server";
import { handleRouteError } from "@/lib/errors";
import { LeadService } from "@/lib/services/lead.service";
import { isRateLimited } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    if (isRateLimited(req)) {
      throw new RateLimitError();
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const band = searchParams.get("band") || undefined;
    const source = searchParams.get("source") || undefined;
    const status = searchParams.get("status") || undefined;
    const country = searchParams.get("country") || undefined;
    const search = searchParams.get("search") || undefined;
    const similarTo = searchParams.get("similarTo") || undefined;
    const limitStr = searchParams.get("limit");
    const format = searchParams.get("format") || "json";

    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    const leads = await LeadService.getLeads({
      category,
      band,
      source,
      status,
      country,
      search,
      similarTo,
      limit,
    });

    // CSV Export
    if (format === "csv") {
      const headers = [
        "Company",
        "Score",
        "Band",
        "Country",
        "Industry",
        "Status",
        "Website",
        "Phone",
        "Signals",
        "Source",
        "AI Summary",
      ];

      const rows = leads.map((lead: any) => [
        `"${(lead.name ?? "").replace(/"/g, '""')}"`,
        lead.score ?? 0,
        lead.scoreBand ?? "",
        `"${(lead.country ?? lead.address ?? "").replace(/"/g, '""')}"`,
        `"${(lead.bestCategory ?? "").replace(/"/g, '""')}"`,
        lead.status ?? "New",
        `"${(lead.website ?? "").replace(/"/g, '""')}"`,
        `"${(lead.phone ?? "").replace(/"/g, '""')}"`,
        lead.signals?.length ?? 0,
        lead.source ?? "",
        `"${(lead.description ?? "").slice(0, 200).replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="pavrix-leads-${Date.now()}.csv"`,
        },
      });
    }

    return Response.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
