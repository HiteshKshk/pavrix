import OpenAI from "openai";
import { AIProvider } from "./provider.interface";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

/**
 * OpenAIProvider — implements AIProvider using GPT-4o-mini.
 * Falls back to mock mode if OPENAI_API_KEY is not configured.
 */
export class OpenAIProvider implements AIProvider {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn("[OpenAIProvider] OPENAI_API_KEY is missing. Running in simulated/mock mode.");
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T> {
    if (!this.openai) {
      return this.simulateStructuredOutput(prompt, schema);
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: zodResponseFormat(schema, "structured_output"),
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens ?? 2048,
        });

        const jsonText = response.choices[0]?.message?.content;
        if (!jsonText) throw new Error("Empty response content from OpenAI");

        const parsed = JSON.parse(jsonText);
        const validated = schema.parse(parsed);
        return validated;
      } catch (error) {
        console.error(
          `[OpenAIProvider] Structured output failed (attempt ${attempts}/${maxAttempts}):`,
          error
        );
        if (attempts >= maxAttempts) throw error;
      }
    }

    throw new Error("[OpenAIProvider] Failed to generate structured output after retry.");
  }

  async generateText(
    prompt: string,
    systemPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.openai) {
      return this.simulateTextOutput(prompt);
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.5,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  private simulateStructuredOutput<T>(prompt: string, schema: z.ZodType<T>): T {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes("icp") || promptLower.includes("profile") || promptLower.includes("expand")) {
      const result = {
        targetCompanies: [
          "B2B retailers looking for premium, sustainable outdoor apparel and gear",
          "Regional distributors supplying sporting goods to independent stores",
          "E-commerce stores with over $1M in annual sales focused on eco-friendly products",
        ],
        exclude: [
          "Mass-market discount stores (e.g. Walmart, Target)",
          "Pure dropshipping outlets without physical presence or custom branding",
          "Industrial hardware/machinery suppliers",
        ],
        reasoning:
          "Based on the product description and target market, focus on premium specialty retail networks and regional distributors who value brand quality over price competition.",
        searchVariants: ["retailers", "wholesale buyers", "sports boutiques"],
      };
      return result as unknown as T;
    }

    try {
      return schema.parse({}) as T;
    } catch {
      throw new Error(
        `[OpenAIProvider] Cannot simulate output for prompt: ${prompt.substring(0, 100)}`
      );
    }
  }

  private simulateTextOutput(prompt: string): string {
    return `[Simulated OpenAI Response] OPENAI_API_KEY not set. In production, this prompt would generate: ${prompt.substring(0, 150)}...`;
  }
}
