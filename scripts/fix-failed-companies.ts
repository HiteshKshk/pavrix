import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { ScoringEngine } from "../lib/scoring.engine";

// Sportswear category
const BRAND_KEYWORDS = [
  "Nike", "Adidas", "Under Armour", "Puma", "Lululemon", "Reebok", "Gymshark",
  "New Balance", "ASICS", "Mizuno", "Brooks", "Saucony", "Hoka",
];

const WEIGHT_TEMPLATE = {
  categoryFit: 0.20,
  geography: 0.10,
  brandMatch: 0.20,
  competitorPresence: 0.25,
  storeCount: 0.05,
  buyingSignals: 0.10,
  websiteQuality: 0.10,
};

async function fixFailedCompanies() {
  const companies = await prisma.company.findMany({
    where: { status: "analysis_failed" },
    include: { scores: true, signals: true },
  });

  console.log(`Found ${companies.length} companies with analysis_failed status.`);

  for (const company of companies) {
    console.log(`\n--- Processing: ${company.name} ---`);

    // Use any existing crawl data if available
    const crawlData = company.crawlData as any;
    const websiteContent = crawlData?.aboutText ?? "";

    // Company data for scoring engine
    const companyData = {
      name: company.name,
      address: company.address ?? "",
      categoryTags: company.categoryTags as string[],
      website: company.website ?? undefined,
      phone: company.phone ?? undefined,
      source: company.source as "inbound" | "outbound",
      hasEcommerce: company.hasEcommerce,
      storeCount: company.storeCount ?? undefined,
      revenueBand: company.revenueBand ?? undefined,
      employeeCountBand: company.employeeCountBand ?? undefined,
      crawlData: crawlData ?? null,
    };

    const scoreRes = ScoringEngine.computeScore(
      companyData,
      company.signals,
      "sportswear",
      BRAND_KEYWORDS,
      WEIGHT_TEMPLATE,
      websiteContent
    );

    console.log(`  Score: ${scoreRes.totalScore}`);
    console.log(`  Breakdown: ${JSON.stringify(scoreRes.breakdown)}`);

    // Upsert score
    if (company.scores.length > 0) {
      await prisma.score.update({
        where: { id: company.scores[0].id },
        data: {
          totalScore: scoreRes.totalScore,
          breakdown: scoreRes.breakdown as any,
          scoreVersion: scoreRes.scoreVersion,
        },
      });
    } else {
      await prisma.score.create({
        data: {
          companyId: company.id,
          categoryName: "sportswear",
          totalScore: scoreRes.totalScore,
          breakdown: scoreRes.breakdown as any,
          scoreVersion: scoreRes.scoreVersion,
        },
      });
    }

    // Update status and description
    const description = `${company.name} is a sportswear and fitness retailer based in ${company.country ?? company.address ?? "Canada"}. Discovered via wholesale buyer discovery pipeline.`;
    
    await prisma.company.update({
      where: { id: company.id },
      data: {
        status: "New",
        description,
      },
    });

    const band = scoreRes.totalScore >= 80 ? "🔥 Hot" 
               : scoreRes.totalScore >= 60 ? "🟡 Warm" 
               : scoreRes.totalScore >= 40 ? "🔵 Nurture" 
               : "⬜ Deprioritize";
    console.log(`  ✓ Status → New  ${band} (score: ${scoreRes.totalScore})`);
  }

  // Final summary
  const allCompanies = await prisma.company.findMany({
    include: { scores: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n=== Final DB Summary ===");
  for (const c of allCompanies) {
    const bestScore = c.scores.reduce((best, s) => Math.max(best, s.totalScore), 0);
    const band = bestScore >= 80 ? "🔥 Hot" : bestScore >= 60 ? "🟡 Warm" : bestScore >= 40 ? "🔵 Nurture" : "⬜ Deprioritize";
    console.log(`  ${band}  ${c.name} | Score: ${bestScore} | Status: ${c.status}`);
  }

  await prisma.$disconnect();
}

fixFailedCompanies().catch(console.error);
