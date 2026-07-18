import { prisma } from "./prisma";

let isDbConnected: boolean | null = null;
let lastChecked: number = 0;
const RECHECK_INTERVAL_MS = 5 * 60 * 1000; // Re-check every 5 minutes

export async function checkDbConnection(): Promise<boolean> {
  // If a live database URL is configured, we must run strictly in live database mode.
  // We should never fall back to mock/simulated memory mode.
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return true;
  }

  const now = Date.now();
  // Return cached result if fresh enough
  if (isDbConnected !== null && now - lastChecked < RECHECK_INTERVAL_MS) {
    return isDbConnected;
  }
  try {
    // Attempt a query to check if Postgres is online, allowing up to 10 seconds for cold starts
    let timeoutId: any;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout")), 10000);
    });
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
    isDbConnected = true;
    lastChecked = now;
    console.log("[DB] Postgres is online. Running in live database mode.");
    return true;
  } catch (error) {
    isDbConnected = false;
    lastChecked = now;
    console.warn("[DB] Postgres is offline. Running in Simulated Data Mode (in-memory). Error:", error);
    return false;
  }
}

export function setDbConnectionStatus(status: boolean) {
  isDbConnected = status;
  lastChecked = Date.now();
}

