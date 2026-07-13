import { prisma } from "./prisma";

let isDbConnected: boolean | null = null;

export async function checkDbConnection(): Promise<boolean> {
  if (isDbConnected !== null) return isDbConnected;
  try {
    // Attempt a fast 1-second timeout query to check if Postgres is online
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 1500)
    );
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise
    ]);
    isDbConnected = true;
    console.log("[DB] Postgres is online. Running in live database mode.");
    return true;
  } catch (error) {
    isDbConnected = false;
    console.warn("[DB] Postgres is offline. Running in Simulated Data Mode (in-memory).");
    return false;
  }
}

export function setDbConnectionStatus(status: boolean) {
  isDbConnected = status;
}
