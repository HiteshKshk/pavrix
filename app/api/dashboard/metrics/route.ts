import { NextRequest } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { RateLimitError, handleRouteError } from "@/lib/errors";
import { DashboardService } from "@/lib/services/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    if (isRateLimited(req)) {
      throw new RateLimitError();
    }

    const result = await DashboardService.getMetrics();

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
