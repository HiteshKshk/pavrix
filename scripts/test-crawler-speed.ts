import { PlaywrightCrawler } from "../lib/crawl/crawler";

async function runTest() {
  console.log("Crawl test starting...");
  const t0 = Date.now();

  console.log("\n1. Crawling invalid domain...");
  const r1 = await PlaywrightCrawler.crawl("https://definitelynotexist1234567.com");
  console.log("Result 1 Error:", r1.error);
  console.log(`Crawl 1 finished in ${Date.now() - t0}ms`);

  console.log("\n2. Crawling localhost (refused port)...");
  const t1 = Date.now();
  const r2 = await PlaywrightCrawler.crawl("https://localhost:19283");
  console.log("Result 2 Error:", r2.error);
  console.log(`Crawl 2 finished in ${Date.now() - t1}ms`);
}

runTest().catch(console.error);
