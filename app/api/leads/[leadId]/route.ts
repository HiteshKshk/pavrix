import { NextRequest } from "next/server";
import { handleRouteError } from "@/lib/errors";
import { LeadService } from "@/lib/services/lead.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const lead = await LeadService.getLead(leadId);

    if (!lead) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
