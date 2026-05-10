import type { IProviderAdapter, ProviderRequest, ProviderResponse } from "@openwolf/interfaces";

/**
 * Google Gemini provider — sends AI tasks to Google's Gemini models.
 *
 * Models are fetched dynamically from the Google AI API via:
 * 1. `@google/generative-ai` SDK's listModels() method
 * 2. REST fallback: GET https://generativelanguage.googleapis.com/v1/models
 * 3. Static fallback if both are unavailable
 *
 * ## API docs
 * - Models list: https://ai.google.dev/api/models#models.list
 * - Generate content: https://ai.google.dev/api/generate-content
 * - SDK: https://github.com/google-gemini/generative-ai-js
 * - API keys: https://aistudio.google.com/apikey
 *
 * Requires GOOGLE_API_KEY or GEMINI_API_KEY env var.
 */
export class GoogleProvider implements IProviderAdapter {
  readonly name = "google";

  /** Models known to be available. Populated lazily by listModels(). */
  models: string[] = [];

  /** Fallback when API is unreachable. */
  private static readonly MODEL_FALLBACKS = [
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-thinking-exp-01-21",
    "learnlm-1.5-pro-experimental",
  ];

  constructor(
    private options?: {
      model?: string;
      apiKey?: string;
    },
  ) {}

  async run(request: ProviderRequest): Promise<ProviderResponse> {
    const model = this.options?.model || "gemini-2.0-flash";
    const apiKey = this.options?.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GoogleProvider: No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY env var.",
      );
    }

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });

      const contextParts = request.context ?? [];
      const fullContent = [
        ...(contextParts.length > 0 ? ["Context:", ...contextParts, "---"] : []),
        request.prompt,
      ].join("\n");

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: fullContent }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
        },
      });

      const response = result.response;
      const content = response.text();

      return {
        content,
        tokensUsed: response.usageMetadata?.totalTokenCount || 0,
        model: model,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Cannot find module")) {
        throw new Error(
          "GoogleProvider: @google/generative-ai package not installed. " +
          "Run: npm install @google/generative-ai",
        );
      }
      throw err;
    }
  }

  async listModels(options?: { forceRefresh?: boolean }): Promise<string[]> {
    if (this.models.length > 0 && !options?.forceRefresh) return this.models;

    const apiKey = this.options?.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    // Try SDK first
    if (apiKey) {
      try {
        const result = await this.listModelsViaSdk(apiKey);
        if (result.length > 0) {
          this.models = result;
          return result;
        }
      } catch {
        // Fall through to REST API
      }

      // REST API fallback (works without the optional SDK)
      try {
        const result = await this.listModelsViaRest(apiKey);
        if (result.length > 0) {
          this.models = result;
          return result;
        }
      } catch {
        // Fall through to static fallback
      }
    }

    this.models = [...GoogleProvider.MODEL_FALLBACKS];
    return this.models;
  }

  private async listModelsViaSdk(apiKey: string): Promise<string[]> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Per Google AI docs: listModels() returns { models: Array<{ name: string, ... }> }
    // The `name` field is "models/gemini-2.0-flash" — strip the "models/" prefix.
    const response = await genAI.listModels();
    const models: Array<{ name: string }> = (response as any).models ?? [];

    return models
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((id) => id && !id.includes("tunedModels"));
  }

  private async listModelsViaRest(apiKey: string): Promise<string[]> {
    // Per Google AI docs: GET https://generativelanguage.googleapis.com/v1/models?key={apiKey}
    // Returns { models: Array<{ name: string, ... }> }
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    const body: { models?: Array<{ name: string }> } = await res.json();
    const models = body.models ?? [];

    return models
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((id) => id && !id.includes("tunedModels"));
  }
}
