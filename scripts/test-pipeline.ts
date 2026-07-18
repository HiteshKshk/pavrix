import "dotenv/config";
import { PipelineService } from "../lib/services/pipeline.service";
import { SerpApiProvider } from "../lib/discovery/serpapi.provider";
import { checkDbConnection } from "../lib/db/connection";
import * as path from "path";


async function runDryRun() {
  console.log("=== Pavrix Prospect AI End-to-End Pipeline Dry Run ===");

  const isDbLive = await checkDbConnection();
  console.log(`Database Live Status: ${isDbLive ? "ONLINE" : "OFFLINE (Simulated Mode)"}`);

  const serpApi = new SerpApiProvider();
  const quota = await serpApi.checkQuota();
  console.log(`SerpAPI Quota Status:`);
  console.log(`- Allowed: ${quota.allowed}`);
  console.log(`- Usage this month: ${quota.currentUsage}`);
  console.log(`- Max Warning Threshold: ${quota.maxAllowed}`);

  const testInput: any = {
    companyName: "DryRun Test Inc",
    productDescription: "Sustainable sportswear made of organic cotton",
    industry: "sportswear",
    country: "Canada",
    targetMarket: "SMB",
    businessTypes: ["retailer"],
    employeeRange: "11-50",
    keywords: ["activewear", "organic apparel"],
  };

  console.log("\nStarting pipeline search for sportswear in Canada...");
  console.log("Input parameters:", JSON.stringify(testInput, null, 2));

  try {
    const generator = PipelineService.runIcpPipeline(testInput, "mock");
    
    for await (const progress of generator) {
      console.log(`[Stage: ${progress.stage}] (${progress.pct}%): ${progress.message}`);
      if (progress.error) {
        console.error(`Pipeline Error yielded: ${progress.error}`);
      }
    }
    
    console.log("\n=== Dry Run Completed Successfully! ===");
  } catch (err) {
    console.error("Dry run execution failed with error:", err);
  }
}

runDryRun();
