import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function timeQueries() {
  console.log("Timing SELECT 1...");
  const t0 = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  console.log(`SELECT 1 took ${Date.now() - t0}ms`);

  console.log("Timing company.findMany...");
  const t1 = Date.now();
  const companies = await prisma.company.findMany({
    include: {
      scores: true,
      signals: true,
      outreach: true,
    },
  });
  console.log(`company.findMany returned ${companies.length} rows, took ${Date.now() - t1}ms`);

  await prisma.$disconnect();
}

timeQueries().catch(console.error);
