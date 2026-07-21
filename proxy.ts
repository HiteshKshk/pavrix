import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  // Log request for monitoring
  console.log(`[Proxy] ${request.method} ${request.nextUrl.pathname}`);
  
  // Forward header for rate limiting support
  const requestHeaders = new Headers(request.headers);
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  requestHeaders.set("x-forwarded-for", ip);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Apply middleware to API routes
export const config = {
  matcher: "/api/:path*",
};
