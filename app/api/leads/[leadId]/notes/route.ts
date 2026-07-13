import { NextRequest } from "next/server";
import { CompanyRepository } from "@/lib/repositories/company.repository";
import { handleRouteError } from "@/lib/errors";

/**
 * PATCH /api/leads/[leadId]/notes
 * Body: { notes: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await req.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return Response.json(
        { success: false, error: { message: "notes must be a string" } },
        { status: 400 }
      );
    }

    const updated = await CompanyRepository.updateNotes(leadId, notes);

    return Response.json({ success: true, data: { id: leadId, notes: updated?.notes ?? notes } });
  } catch (error) {
    return handleRouteError(error);
  }
}
