import { ScoringEngine } from "../lib/scoring.engine";
import { SignalEngine } from "../lib/signal.engine";
import { DiscoveryEngine } from "../lib/discovery.engine";

function runTests() {
  console.log("=========================================");
  console.log("RUNNING PAVRIX PLATFORM ENGINES UNIT TESTS");
  console.log("=========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.log(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: Address Jaccard Similarity ---
  console.log("\n--- Testing Identity Resolution (Jaccard Address Similarity) ---");
  const addr1 = "100 Oxford Street, London, United Kingdom";
  const addr2 = "100 Oxford St., London, UK";
  const addr3 = "200 Regent Street, London, United Kingdom";

  const sim12 = DiscoveryEngine.addressSimilarity(addr1, addr2);
  const sim13 = DiscoveryEngine.addressSimilarity(addr1, addr3);

  assert(sim12 >= 0.70, `Abbreviated address match similarity: ${(sim12 * 100).toFixed(0)}%`);
  assert(sim13 < 0.50, `Different street match similarity: ${(sim13 * 100).toFixed(0)}%`);

  // --- Test 2: Website Signal Scanning ---
  console.log("\n--- Testing Website Content Signal Scanner ---");
  const siteContent = "We are super excited to announce we are opening a new store in Manchester this coming winter! We are also hiring a senior merchandiser and a retail buyer to expand our operations. Brands we stock include Nike, Adidas and Lululemon.";
  const brandKeywords = ["Nike", "Adidas", "Puma", "Lululemon"];

  const signals = SignalEngine.detectSignals(siteContent, brandKeywords);
  
  const hasExpansion = signals.some(s => s.type === "expansion" && s.pointValue === 30);
  const hasHiring = signals.some(s => s.type === "hiring" && s.pointValue === 20);
  const hasComp = signals.some(s => s.type === "competitor_brand_sold" && s.pointValue === 25);

  assert(hasExpansion, "Detects 'opening a new store' as expansion signal (+30 pts)");
  assert(hasHiring, "Detects 'hiring ... buyer' as hiring signal (+20 pts)");
  assert(hasComp, "Detects Nike, Adidas as competitor brands sold (+25 pts)");

  // --- Test 3: Deterministic Scoring Engine ---
  console.log("\n--- Testing Category-Aware Scoring Engine ---");
  const mockCompany = {
    categoryTags: ["sportswear"],
    address: "100 London Blvd, London, UK",
    revenueBand: "$1M - $10M",
    employeeCountBand: "11-50",
    storeCount: 3,
    hasEcommerce: true,
  };

  const compSignals = [
    { type: "expansion", pointValue: 30, detectedDate: new Date() },
    { type: "hiring", pointValue: 20, detectedDate: new Date() }
  ];

  const scoreRes = ScoringEngine.computeScore(
    mockCompany,
    compSignals,
    "sportswear",
    brandKeywords,
    {
      industryMatch: 0.20,
      productMatch: 0.30,
      buyingSignals: 0.20,
      websiteCompleteness: 0.10,
      companyInfoCompleteness: 0.10,
      aiConfidence: 0.10,
    },
    siteContent
  );

  console.log(`Computed Score: ${scoreRes.totalScore} (${scoreRes.band})`);
  assert(scoreRes.totalScore >= 75 && scoreRes.totalScore <= 85, "Total score fits expected range for warm/hot lead");
  assert(scoreRes.breakdown.categoryFit.raw === 100, "Category Fit is 100%");
  assert(scoreRes.breakdown.storeCount.raw === 100, "Store footprint raw score matched (100%)");
  assert(scoreRes.breakdown.buyingSignals.raw === 50, "Signals raw score sum: 30 + 20 = 50 pts");

  console.log("\n=========================================");
  console.log(`TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
