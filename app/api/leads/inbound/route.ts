import { NextRequest } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { RateLimitError, ValidationError, handleRouteError } from "@/lib/errors";
import { LeadService } from "@/lib/services/lead.service";

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(req)) {
      throw new RateLimitError();
    }

    const body = await req.json();
    const {
      name,
      website,
      phone,
      address,
      categoryName,
      revenueBand,
      employeeCountBand,
      storeCount,
      hasEcommerce,
      contactEmail,
      message,
    } = body;

    if (!name) {
      throw new ValidationError("Missing required field: name");
    }

    const result = await LeadService.submitInboundForm({
      name,
      website,
      phone,
      address,
      categoryName,
      revenueBand,
      employeeCountBand,
      storeCount: storeCount !== undefined ? parseInt(storeCount, 10) : undefined,
      hasEcommerce: hasEcommerce === true || hasEcommerce === "true",
      contactEmail,
      message,
    });

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
