import type { IProviderAdapter, ProviderRequest, ProviderResponse } from "@openwolf/interfaces";

/**
 * DeepSeek provider — sends AI tasks to DeepSeek models via their
 * OpenAI-compatible API.
 *
 * Models are fetched dynamically from the DeepSeek API via
 * `client.models.list()` (same as OpenAI). Falls back to a curated list
 * when the API is unreachable.
 *
 * ## API docs
 * - Overview: https://api-docs.deepseek.com/
 * - Chat: https://api-docs.deepseek.com/api/create-chat-completion
 * - Models: https://api-docs.deepseek.com/api/list-models
 * - DeepSeek is OpenAI-compatible, so the `openai` npm package can be used.
 *
 * Requires DEEPSEEK_API_KEY env var (or apiKey in constructor options).
 */
export class DeepSeekProvider implements IProviderAdapter {
  readonly name = "deepseek";

  /** Models known to be available. Populated lazily by listModels(). */
  models: string[] = [];

  /** Fallback when API is unreachable. */
  private static readonly MODEL_FALLBACKS = [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-coder",
  ];

  constructor(
    private options?: {
      model?: string;
      baseURL?: string;
      apiKey?: string;
    },
  ) {}

  async run(request: ProviderRequest): Promise<ProviderResponse> {
    const model = this.options?.model || "deepseek-chat";
    const apiKey = this.options?.apiKey || process.env.DEEPSEEK_API_KEY;
    const baseURL = this.options?.baseURL || "https://api.deepseek.com/v1";

    if (!apiKey) {
      throw new Error(
        "DeepSeekProvider: No API key found. Set DEEPSEEK_API_KEY env var or pass apiKey in constructor options.",
      );
    }

    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey, baseURL });

      const contextParts = request.context ?? [];
      const fullContent = [
        ...(contextParts.length > 0 ? ["Context:", ...contextParts, "---"] : []),
        request.prompt,
      ].join("\n");

      const response = await client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages: [{ role: "user", content: fullContent }],
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
          "DeepSeekProvider: openai package not installed. Run: npm install openai",
        );
      }
      throw err;
    }
  }

  async listModels(options?: { forceRefresh?: boolean }): Promise<string[]> {
    if (this.models.length > 0 && !options?.forceRefresh) return this.models;

    const apiKey = this.options?.apiKey || process.env.DEEPSEEK_API_KEY;
    const baseURL = this.options?.baseURL || "https://api.deepseek.com/v1";

    if (!apiKey) {
      this.models = [...DeepSeekProvider.MODEL_FALLBACKS];
      return this.models;
    }

    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey, baseURL });

      // Per DeepSeek docs: GET /v1/models returns { data: Array<{ id: string, ... }> }
      const list = await client.models.list();
      const data: Array<{ id: string }> = (list as any).data ?? [];
      this.models = data.map((m) => m.id).filter(Boolean);

      if (this.models.length === 0) {
        this.models = [...DeepSeekProvider.MODEL_FALLBACKS];
      }
      return this.models;
    } catch {
      this.models = [...DeepSeekProvider.MODEL_FALLBACKS];
      return this.models;
    }
  }
}
