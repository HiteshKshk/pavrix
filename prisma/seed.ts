import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { SEED_CATEGORIES, generateMockCompanies, generateMockSignals } from "../lib/db/mock-data";
import { ScoringEngine } from "../lib/scoring.engine";
import { AIService } from "../lib/services/ai.service";

async function main() {
  console.log("[Seed] Enabling pgvector extension...");
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("[Seed] pgvector extension enabled successfully.");
  } catch (e) {
    console.warn("[Seed] Warning: Failed to enable vector extension. Proceeding anyway...", e);
  }

  console.log("[Seed] Cleaning existing database...");
  await prisma.outreach.deleteMany();
  await prisma.score.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.company.deleteMany();
  await prisma.category.deleteMany();
  await prisma.leadInbound.deleteMany();

  console.log("[Seed] Seeding categories...");
  for (const cat of SEED_CATEGORIES) {
    await prisma.category.create({
      data: {
        name: cat.name,
        weightTemplate: cat.weightTemplate as any,
        brandKeywords: cat.brandKeywords as any,
      },
    });
  }
  console.log(`[Seed] Seeded ${SEED_CATEGORIES.length} categories.`);

  console.log("[Seed] Generating mock companies...");
  const rawComps = generateMockCompanies();
  const rawSigs = generateMockSignals(rawComps);

  console.log(`[Seed] Ingesting ${rawComps.length} companies and their signals...`);
  for (const comp of rawComps) {
    // Generate deterministic mock embedding
    const embedding = new Array(1536).fill(0).map((_, idx) => Math.sin(comp.name.charCodeAt(0) + idx));
    const mag = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    const normalizedEmbedding = embedding.map(v => v / (mag || 1.0));

    // Save Company
    const savedComp = await prisma.company.create({
      data: {
        id: comp.id,
        name: comp.name,
        address: comp.address,
        categoryTags: comp.categoryTags,
        website: comp.website,
        phone: comp.phone,
        source: comp.source,
        storeCount: comp.storeCount,
        hasEcommerce: comp.hasEcommerce,
        revenueBand: comp.revenueBand,
        employeeCountBand: comp.employeeCountBand,
        description: comp.mockWebsiteContent ? `AI summary for ${comp.name} representing a premium distributor profile.` : null,
      },
    });

    // Update PGVector embedding using raw query
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE companies SET embedding = $1::vector WHERE id = $2`,
        `[${normalizedEmbedding.join(",")}]`,
        savedComp.id
      );
    } catch (err) {
      // ignore vector updates if column does not support it
    }

    // Save Signals
    const compSigs = rawSigs.filter((s) => s.companyId === comp.id);
    const dbSignals: any[] = [];
    for (const sig of compSigs) {
      const dbSig = await prisma.signal.create({
        data: {
          companyId: savedComp.id,
          type: sig.type,
          detectedDate: new Date(sig.detectedDate),
          pointValue: sig.pointValue,
          description: sig.description,
        },
      });
      dbSignals.push(dbSig);
    }

    // Score Company against each of its category tags
    let bestScore = 0;
    let bestScoreRecord: any = null;

    for (const catName of comp.categoryTags) {
      const catObj = SEED_CATEGORIES.find((c) => c.name === catName)!;
      const weights = catObj.weightTemplate;
      const brandKws = catObj.brandKeywords;

      const scoreRes = ScoringEngine.computeScore(
        comp,
        dbSignals,
        catName,
        brandKws,
        weights,
        comp.mockWebsiteContent
      );

      if (scoreRes.totalScore > bestScore) {
        bestScore = scoreRes.totalScore;
      }

      bestScoreRecord = await prisma.score.create({
        data: {
          companyId: savedComp.id,
          categoryName: catName,
          totalScore: scoreRes.totalScore,
          breakdown: scoreRes.breakdown as any,
          scoreVersion: scoreRes.scoreVersion,
        },
      });
    }

    // Generate Outreach if qualified (score >= 60)
    if (bestScore >= 60 && compSigs.length > 0) {
      const explanation = `A qualification score of ${bestScore}/100 was computed. This high score is driven by a perfect category fit and strong buying signals, paired with active B2B e-commerce capabilities.`;
      
      await prisma.company.update({
        where: { id: savedComp.id },
        data: {
          aiExplanation: explanation,
        },
      });

      const topSignals = compSigs.slice(0, 2);
      await prisma.outreach.create({
        data: {
          companyId: savedComp.id,
          draftText: `Hi Team,\n\nI noticed ${comp.name} recently experienced a buying signal: ${topSignals[0]?.description || "growing retail presence"}. As a premier wholesale distributor, Pavrix would love to supply you with top authentic brands in ${comp.categoryTags.join(" and ")}.\n\nLet's connect!\n\nBest regards,\nPavrix Sales`,
          status: "drafted",
          signalsReferenced: topSignals.map(s => s.type) as any,
        },
      });
    }
  }

  console.log(`[Seed] Ingested ${rawComps.length} companies, scored them, and seeded database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
