import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import * as path from "path";


async function test() {
  try {
    console.log("Attempting prisma.$queryRaw...");
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Prisma query raw success!", result);
  } catch (err) {
    console.error("Prisma query raw failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
