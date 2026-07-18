import { GoogleGenAI } from "@google/genai";
import { AIProvider } from "./provider.interface";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * GeminiProvider — implements AIProvider using Google Gemini 2.5 Flash.
 * Falls back to mock mode if GEMINI_API_KEY is not configured.
 */
export class GeminiProvider implements AIProvider {
  private genai: GoogleGenAI | null = null;
  private readonly model = "gemini-2.0-flash";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      this.genai = new GoogleGenAI({ apiKey });
    } else {
      console.warn(
        "[GeminiProvider] GEMINI_API_KEY is missing. Running in simulated/mock mode."
      );
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodTypeAny,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T> {
    if (!this.genai) {
      return this.simulateStructuredOutput(prompt, schema);
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;

        // Convert Zod schema to JSON schema for Gemini's responseSchema.
        // The installed zod-to-json-schema typings are stricter than the current Zod version,
        // so we cast through any to preserve compatibility during build.
        const jsonSchema = zodToJsonSchema(schema as any, { target: "openApi3" as any });

        const response = await this.genai.models.generateContent({
          model: this.model,
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
            },
          ],
          config: {
            temperature: options?.temperature ?? 0.2,
            maxOutputTokens: options?.maxTokens ?? 2048,
            responseMimeType: "application/json",
            responseSchema: jsonSchema as any,
          },
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini");

        const parsed = JSON.parse(text);
        const validated = schema.parse(parsed) as T;
        return validated;
      } catch (error) {
        console.error(
          `[GeminiProvider] Structured output failed (attempt ${attempts}/${maxAttempts}):`,
          error
        );
        if (attempts >= maxAttempts) throw error;
      }
    }

    throw new Error("[GeminiProvider] Failed to generate structured output after retry.");
  }

  async generateText(
    prompt: string,
    systemPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.genai) {
      return this.simulateTextOutput(prompt);
    }

    try {
      const response = await this.genai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
          },
        ],
        config: {
          temperature: options?.temperature ?? 0.5,
          maxOutputTokens: options?.maxTokens ?? 1024,
        },
      });

      return response.text ?? "";
    } catch (error) {
      console.error("[GeminiProvider] Text generation failed:", error);
      throw error;
    }
  }

  private simulateStructuredOutput<T>(prompt: string, schema: z.ZodTypeAny): T {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes("icp") || promptLower.includes("profile") || promptLower.includes("expand")) {
      const result = {
        targetCompanies: [
          "Specialty sporting goods retailers with multi-brand collections",
          "Regional athletic boutiques serving premium segment customers",
          "E-commerce stores with >$1M annual sales in sports/outdoor",
          "Sports chain stores with physical and digital presence",
        ],
        exclude: [
          "Mass-market discount stores (Walmart, Target, Costco)",
          "Pure dropshipping outlets without inventory",
          "Industrial/machinery suppliers",
          "Amazon-only marketplace sellers",
        ],
        reasoning:
          "Targeting specialty retailers who carry multiple premium brands, have established buyer relationships, and are looking to expand their wholesale catalog.",
        searchVariants: [
          "sporting goods retailers",
          "athletic stores wholesale",
          "sports boutiques buyers",
        ],
      };
      return result as unknown as T;
    }

    try {
      return schema.parse({}) as T;
    } catch {
      throw new Error(
        `[GeminiProvider] Cannot simulate output for prompt: ${prompt.substring(0, 100)}`
      );
    }
  }

  private simulateTextOutput(prompt: string): string {
    return `[Simulated Gemini Response] GEMINI_API_KEY not set. In production, this would generate: ${prompt.substring(0, 150)}...`;
  }
}
