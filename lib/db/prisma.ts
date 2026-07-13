import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Return a dummy connection string during build if DATABASE_URL is not set
    return "postgresql://postgres:postgres@localhost:5432/pavrix_prospect_ai?schema=public";
  }
  return url;
};

if (process.env.NODE_ENV === "production") {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString: getDatabaseUrl() });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ["query", "error", "warn"],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
