import crypto from "crypto";

// Simple high-performance in-memory cache to save API budget and prevent redundant calls
const localCache = new Map<string, any>();

/**
 * Generates a SHA-256 hash for a given stage and input object.
 */
export function generateCacheKey(stage: string, input: any): string {
  const serializedInput = typeof input === "string" ? input : JSON.stringify(input);
  return crypto
    .createHash("sha256")
    .update(`${stage}:${serializedInput}`)
    .digest("hex");
}

/**
 * Caches an AI provider call using the local in-memory storage.
 */
export async function withAICache<T>(
  stage: string,
  input: any,
  fetcher: () => Promise<T>
): Promise<T> {
  const cacheKey = generateCacheKey(stage, input);

  const cached = localCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[AI Cache Hit] Stage: ${stage}`);
    return cached as T;
  }

  // Fetch from live LLM / fetcher
  const result = await fetcher();
  
  localCache.set(cacheKey, result);
  console.log(`[AI Cache Written] Stage: ${stage}`);

  return result;
}
