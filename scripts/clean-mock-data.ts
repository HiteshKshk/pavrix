import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function cleanMockData() {
  // Delete all mock seed data (company-uuid-* IDs)
  const mockCompanies = await prisma.company.findMany({
    where: { id: { startsWith: "company-uuid-" } },
    select: { id: true },
  });
  const mockIds = mockCompanies.map((c) => c.id);
  console.log("Found mock companies to delete:", mockIds.length);

  if (mockIds.length > 0) {
    await prisma.outreach.deleteMany({ where: { companyId: { in: mockIds } } });
    await prisma.score.deleteMany({ where: { companyId: { in: mockIds } } });
    await prisma.signal.deleteMany({ where: { companyId: { in: mockIds } } });
    await prisma.company.deleteMany({ where: { id: { in: mockIds } } });
    console.log("✓ Deleted mock companies and all related records.");
  } else {
    console.log("No mock companies found.");
  }

  // Also clean up old icp_searches with no real data
  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, status: true, description: true, source: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nRemaining real companies:", allCompanies.length);
  for (const c of allCompanies) {
    console.log(`  - [${c.source}] ${c.name} | status: ${c.status}`);
  }
  
  await prisma.$disconnect();
}

cleanMockData().catch(console.error);
