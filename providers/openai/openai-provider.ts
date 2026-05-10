import type { IProviderAdapter, ProviderRequest, ProviderResponse } from "@openwolf/interfaces";

/**
 * OpenAI GPT provider — sends AI tasks to OpenAI models.
 *
 * Models are fetched dynamically from the OpenAI API via `client.models.list()`.
 * Falls back to a curated list when the API is unreachable.
 *
 * ## API docs
 * - Models: https://platform.openai.com/docs/api-reference/models/list
 * - Chat: https://platform.openai.com/docs/api-reference/chat
 * - SDK: https://github.com/openai/openai-node
 *
 * Supports custom baseURL for OpenAI-compatible backends.
 */
export class OpenAIProvider implements IProviderAdapter {
  readonly name = "openai";

  /** Models known to be available. Populated lazily by listModels(). */
  models: string[] = [];

  /** Fallback when API is unreachable. */
  private static readonly MODEL_FALLBACKS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "o3",
    "o3-mini",
    "o4-mini",
  ];

  constructor(
    private options?: {
      model?: string;
      baseURL?: string;
      apiKey?: string;
    },
  ) {}

  async run(request: ProviderRequest): Promise<ProviderResponse> {
    const model = this.options?.model || "gpt-4o";
    const apiKey = this.options?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAIProvider: No API key found. Set OPENAI_API_KEY env var or pass apiKey in constructor options.",
      );
    }

    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey,
        baseURL: this.options?.baseURL,
      });

      const messages: Array<{ role: "user" | "system"; content: string }> = [];
      const contextParts = request.context ?? [];
      const fullContent = [
        ...(contextParts.length > 0 ? ["Context:", ...contextParts, "---"] : []),
        request.prompt,
      ].join("\n");

      messages.push({ role: "user", content: fullContent });

      const response = await client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages,
      });

      const content = response.choices?.[0]?.message?.content || "";

      return {
        content,
        tokensUsed: response.usage?.total_tokens || 0,
        model: response.model,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Cannot find module")) {
        throw new Error(
          "OpenAIProvider: openai package not installed. Run: npm install openai",
        );
      }
      throw err;
    }
  }

  async listModels(options?: { forceRefresh?: boolean }): Promise<string[]> {
    if (this.models.length > 0 && !options?.forceRefresh) return this.models;

    const apiKey = this.options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.models = [...OpenAIProvider.MODEL_FALLBACKS];
      return this.models;
    }

    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey,
        baseURL: this.options?.baseURL,
      });

      // Per OpenAI API docs: GET https://api.openai.com/v1/models
      // Returns { data: Array<{ id: string, object: "model", created: number, owned_by: string }> }
      const list = await client.models.list();
      const data: Array<{ id: string }> = (list as any).data ?? [];
      this.models = data.map((m) => m.id).filter(Boolean);

      if (this.models.length === 0) {
        this.models = [...OpenAIProvider.MODEL_FALLBACKS];
      }
      return this.models;
    } catch {
      // API unreachable — use fallback
      this.models = [...OpenAIProvider.MODEL_FALLBACKS];
      return this.models;
    }
  }
}
