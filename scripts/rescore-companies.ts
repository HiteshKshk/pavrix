import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { ScoringEngine } from "../lib/scoring.engine";
import { SignalEngine } from "../lib/signal.engine";
import { PlaywrightCrawler } from "../lib/crawl/crawler";

// Sportswear category keywords
const SPORTSWEAR_BRAND_KEYWORDS = [
  "Nike", "Adidas", "Under Armour", "Puma", "Lululemon", "Reebok", "Gymshark",
  "New Balance", "ASICS", "Mizuno", "Brooks", "Saucony", "Hoka",
];

const SPORTSWEAR_WEIGHT_TEMPLATE = {
  categoryFit: 0.20,
  geography: 0.10,
  brandMatch: 0.20,
  competitorPresence: 0.25,
  storeCount: 0.05,
  buyingSignals: 0.10,
  websiteQuality: 0.10,
};

async function rescoreFailedCompanies() {
  const companies = await prisma.company.findMany({
    where: { status: "analysis_failed" },
    include: { scores: true, signals: true },
  });

  console.log(`Found ${companies.length} companies with analysis_failed status.`);

  for (const company of companies) {
    console.log(`\n--- Processing: ${company.name} ---`);

    // Try to crawl website for real content
    let websiteContent = "";
    let crawlData: any = null;

    if (company.website) {
      try {
        console.log(`  Crawling: ${company.website}`);
        crawlData = await PlaywrightCrawler.crawl(company.website, SPORTSWEAR_BRAND_KEYWORDS);
        websiteContent = crawlData?.aboutText ?? "";
        console.log(`  Crawl result: ${websiteContent.length} chars, ecom: ${crawlData?.hasEcommerce}`);
      } catch (err) {
        console.warn(`  Crawl failed: ${err}`);
      }
    }

    // Detect signals from crawled content
    const detectedSignals = SignalEngine.detectSignals(
      websiteContent || company.name,
      SPORTSWEAR_BRAND_KEYWORDS,
      crawlData ?? undefined
    );

    // Save new signals if any
    const savedSignals: any[] = [];
    for (const sig of detectedSignals) {
      try {
        const savedSig = await prisma.signal.create({
          data: {
            companyId: company.id,
            type: sig.type,
            detectedDate: new Date(),
            pointValue: sig.pointValue,
            description: sig.description,
            sourceField: sig.sourceField,
            matchedText: sig.matchedText,
          },
        });
        savedSignals.push(savedSig);
      } catch (e) {
        console.warn(`  Signal save failed:`, e);
      }
    }

    // Combine existing + new signals
    const allSignals = [...company.signals, ...savedSignals];

    // Score the company
    const companyData = {
      name: company.name,
      address: company.address ?? "",
      categoryTags: company.categoryTags as string[],
      website: company.website ?? undefined,
      phone: company.phone ?? undefined,
      source: company.source as "inbound" | "outbound",
      hasEcommerce: crawlData?.hasEcommerce ?? company.hasEcommerce,
      storeCount: crawlData?.storeCount ?? company.storeCount ?? undefined,
      revenueBand: company.revenueBand ?? undefined,
      employeeCountBand: company.employeeCountBand ?? undefined,
      crawlData: crawlData ?? null,
    };

    const scoreRes = ScoringEngine.computeScore(
      companyData,
      allSignals,
      "sportswear",
      SPORTSWEAR_BRAND_KEYWORDS,
      SPORTSWEAR_WEIGHT_TEMPLATE,
      websiteContent
    );

    console.log(`  Score: ${scoreRes.totalScore} (breakdown: ${JSON.stringify(scoreRes.breakdown)})`);

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

    // Update company status, description, and crawl data
    const description =
      websiteContent.length > 50
        ? `${company.name} is a sports and fitness retailer based in ${company.country ?? company.address}. ` +
          (crawlData?.hasEcommerce ? "They offer e-commerce ordering. " : "") +
          (allSignals.length > 0 ? `Buying signals detected: ${allSignals.slice(0,2).map((s: any) => s.description).join("; ")}` : "")
        : `${company.name} is a sportswear retailer based in ${company.country ?? company.address}.`;

    await prisma.company.update({
      where: { id: company.id },
      data: {
        status: "New",
        description,
        hasEcommerce: crawlData?.hasEcommerce ?? company.hasEcommerce,
        storeCount: crawlData?.storeCount ?? company.storeCount,
      },
    });

    console.log(`  ✓ Updated status to New, score = ${scoreRes.totalScore}`);
  }

  // Summary
  const allCompanies = await prisma.company.findMany({
    include: { scores: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n=== Final DB Summary ===");
  for (const c of allCompanies) {
    const bestScore = c.scores.reduce((best, s) => Math.max(best, s.totalScore), 0);
    const band = bestScore >= 80 ? "🔥 Hot" : bestScore >= 60 ? "🟡 Warm" : bestScore >= 40 ? "🔵 Nurture" : "⬜ Deprioritize";
    console.log(`  ${band} ${c.name} | Score: ${bestScore} | Status: ${c.status}`);
  }

  await prisma.$disconnect();
}

rescoreFailedCompanies().catch(console.error);
