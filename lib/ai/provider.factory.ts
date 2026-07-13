import { AIProvider } from "./provider.interface";
import { OpenAIProvider } from "./openai.provider";
import { GeminiProvider } from "./gemini.provider";

/**
 * AIProviderFactory — returns the active LLM provider based on AI_PROVIDER env var.
 * Defaults to OpenAI if not set.
 * Cached as a module-level singleton to avoid re-instantiation on every call.
 */

let cachedProvider: AIProvider | null = null;
let cachedProviderType: string | null = null;

export class AIProviderFactory {
  /**
   * Returns the active AIProvider.
   * Reads AI_PROVIDER env var: "gemini" | "openai" (default: "openai")
   */
  static getProvider(): AIProvider {
    const providerType = (process.env.AI_PROVIDER ?? "openai").toLowerCase();

    // Re-use cached instance if provider type hasn't changed
    if (cachedProvider && cachedProviderType === providerType) {
      return cachedProvider;
    }

    let provider: AIProvider;

    switch (providerType) {
      case "gemini":
        provider = new GeminiProvider();
        break;
      case "openai":
      default:
        provider = new OpenAIProvider();
        break;
    }

    cachedProvider = provider;
    cachedProviderType = providerType;
    return provider;
  }

  /**
   * Returns a specific provider by name, ignoring the env var.
   * Useful for per-call overrides.
   */
  static getProviderByType(type: "openai" | "gemini"): AIProvider {
    switch (type) {
      case "gemini":
        return new GeminiProvider();
      case "openai":
      default:
        return new OpenAIProvider();
    }
  }
}
