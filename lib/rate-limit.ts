import { NextRequest } from "next/server";

// Simple in-memory rate limit tracker
const tracker = new Map<string, { count: number; resetTime: number }>();

/**
 * Basic in-memory rate limiter based on client IP.
 * Defaults to 30 requests per minute per IP.
 */
export function isRateLimited(req: NextRequest, limit = 30, windowMs = 60000): boolean {
  const ip = req.headers.get("x-forwarded-for") || "global-ip";
  const now = Date.now();
  
  const tracking = tracker.get(ip);
  
  if (!tracking) {
    tracker.set(ip, { count: 1, resetTime: now + windowMs });
    return false; // Not limited
  }
  
  if (now > tracking.resetTime) {
    // Reset window
    tracker.set(ip, { count: 1, resetTime: now + windowMs });
    return false; // Not limited
  }
  
  if (tracking.count >= limit) {
    return true; // Rate limited!
  }
  
  tracking.count++;
  return false;
}
