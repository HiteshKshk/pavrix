import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from the project root .env
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL env var not found");
    process.exit(1);
  }

  console.log("Connecting to database to enable pgvector extension...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected successfully. Running: CREATE EXTENSION IF NOT EXISTS vector;");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("Extension 'vector' enabled successfully!");
  } catch (error) {
    console.error("Failed to enable extension:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
