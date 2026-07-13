import { NextRequest } from "next/server";
import { CompanyRepository } from "@/lib/repositories/company.repository";
import { LEAD_STATUS_VALUES, LeadStatus } from "@/lib/lead-status";
import { handleRouteError } from "@/lib/errors";

/**
 * PATCH /api/leads/[leadId]/status
 * Body: { status: LeadStatus }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !LEAD_STATUS_VALUES.includes(status as LeadStatus)) {
      return Response.json(
        {
          success: false,
          error: {
            message: `Invalid status. Must be one of: ${LEAD_STATUS_VALUES.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const updated = await CompanyRepository.updateStatus(leadId, status as LeadStatus);

    if (!updated) {
      return Response.json(
        { success: false, error: { message: "Lead not found" } },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: { id: leadId, status } });
  } catch (error) {
    return handleRouteError(error);
  }
}
