export interface AIProvider {
  /**
   * Generates a structured JSON output validated against a Zod schema or JSON Schema.
   */
  generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: any,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T>;

  /**
   * Generates standard text response.
   */
  generateText(
    prompt: string,
    systemPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
}
