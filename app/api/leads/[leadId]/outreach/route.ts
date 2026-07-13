import { NextRequest } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { RateLimitError, handleRouteError, ValidationError } from "@/lib/errors";
import { LeadService } from "@/lib/services/lead.service";
import { checkDbConnection } from "@/lib/db/connection";
import { prisma } from "@/lib/db/prisma";
import { MemoryStore } from "@/lib/db/memory-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const isDbLive = await checkDbConnection();
    
    let outreach: any[] = [];
    if (isDbLive) {
      try {
        outreach = await prisma.outreach.findMany({
          where: { companyId: leadId },
          orderBy: { createdAt: "desc" },
        });
      } catch (e) {}
    }
    
    if (outreach.length === 0) {
      outreach = MemoryStore.getOutreach(leadId);
    }

    return Response.json({
      success: true,
      data: outreach,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    if (isRateLimited(req)) {
      throw new RateLimitError();
    }

    const { leadId } = await params;
    const body = await req.json();
    const { outreachId, draftText, status } = body;

    if (!outreachId) {
      throw new ValidationError("Missing required parameter: outreachId");
    }

    if (!draftText || !status) {
      throw new ValidationError("Missing required parameters: draftText or status");
    }

    const updated = await LeadService.updateOutreach(outreachId, draftText, status);

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
