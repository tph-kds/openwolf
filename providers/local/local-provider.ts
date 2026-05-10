import { spawnSync } from "node:child_process";
import type { IProviderAdapter, ProviderRequest, ProviderResponse } from "@openwolf/interfaces";

/**
 * Local AI provider — sends AI tasks to locally running models.
 *
 * Supports three backends:
 * 1. **Ollama** (default) — CLI `ollama run` or OpenAI-compatible API at http://localhost:11434/v1
 * 2. **LM Studio** — OpenAI-compatible API at http://localhost:1234/v1
 * 3. **Custom** — any OpenAI-compatible API endpoint
 *
 * Models are fetched dynamically from:
 * - Ollama: `ollama list` CLI or `GET /api/tags` REST API
 * - LM Studio: `GET /v1/models` (OpenAI-compatible)
 * - Custom: `GET /v1/models` (OpenAI-compatible)
 *
 * Falls back to a curated list when the backend is unreachable.
 *
 * ## API docs
 * - Ollama: https://github.com/ollama/ollama/blob/main/docs/api.md#list-local-models
 * - LM Studio: OpenAI-compatible, uses /v1/models
 * - openai SDK: https://github.com/openai/openai-node
 */
export class LocalProvider implements IProviderAdapter {
  readonly name = "local";

  /** Models known to be available. Populated lazily by listModels(). */
  models: string[] = [];

  /** Fallback models per backend (used when API/CLI is unreachable). */
  private static readonly MODEL_FALLBACKS: Record<string, string[]> = {
    ollama: ["llama3", "codellama", "mistral", "mixtral", "deepseek-coder", "qwen2.5", "phi4", "gemma3"],
    "lm-studio": ["local-model"],
    custom: [],
  };

  constructor(
    private options?: {
      backend?: "ollama" | "lm-studio" | "custom";
      model?: string;
      baseURL?: string;
      apiKey?: string;
    },
  ) {}

  async run(request: ProviderRequest): Promise<ProviderResponse> {
    const backend = this.options?.backend || "ollama";
    const model = this.options?.model || this.getDefaultModel(backend);

    // Try Ollama CLI first (fastest, no SDK needed)
    if (backend === "ollama" && this.hasOllama() && !this.options?.baseURL) {
      return this.runViaOllamaCli(request, model);
    }

    // Fallback to OpenAI-compatible API
    return this.runViaApi(request, model, backend);
  }

  async listModels(options?: { forceRefresh?: boolean }): Promise<string[]> {
    if (this.models.length > 0 && !options?.forceRefresh) return this.models;

    const backend = this.options?.backend || "ollama";

    // Try backend-specific listing
    let result: string[] = [];

    switch (backend) {
      case "ollama":
        result = this.listOllamaModels();
        break;
      case "lm-studio":
        result = await this.listOpenAiCompatibleModels(this.getBaseURL("lm-studio"), "");
        break;
      case "custom":
        if (this.options?.baseURL) {
          result = await this.listOpenAiCompatibleModels(
            this.options.baseURL,
            this.options.apiKey || "",
          );
        }
        break;
    }

    if (result.length > 0) {
      this.models = result;
      return result;
    }

    // Fallback
    this.models = [...(LocalProvider.MODEL_FALLBACKS[backend] ?? [])];
    return this.models;
  }

  private getDefaultModel(backend: string): string {
    switch (backend) {
      case "ollama": return "llama3";
      case "lm-studio": return "local-model";
      default: return "default";
    }
  }

  private getBaseURL(backend: string): string {
    if (this.options?.baseURL) return this.options.baseURL;
    switch (backend) {
      case "ollama": return "http://localhost:11434/v1";
      case "lm-studio": return "http://localhost:1234/v1";
      default: return "http://localhost:11434/v1";
    }
  }

  /** List models via ollama CLI: `ollama list` */
  private listOllamaModels(): string[] {
    // Try CLI first
    if (this.hasOllama()) {
      const proc = spawnSync("ollama", ["list"], {
        encoding: "utf-8" as const,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        windowsHide: true,
      });

      if (proc.status === 0) {
        // Parse CLI table output: "NAME\tID\tSIZE\tMODIFIED"
        const lines = (proc.stdout || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const models = lines
          .slice(1) // skip header
          .map((l) => l.split(/\s+/)[0]) // first column = model name
          .filter(Boolean);
        if (models.length > 0) return models;
      }
    }

    // Try REST API: GET http://localhost:11434/api/tags
    try {
      const result = this.listOllamaViaApi();
      if (result.length > 0) return result;
    } catch {
      // Fall through to fallback
    }

    return [];
  }

  /** List models via Ollama REST API: GET /api/tags */
  private listOllamaViaApi(): string[] {
    // We use a synchronous XMLHttpRequest-like approach — for sync mode use spawnSync with curl/node
    const baseURL = this.options?.baseURL?.replace(/\/v1$/, "") || "http://localhost:11434";
    try {
      const proc = spawnSync(
        process.platform === "win32" ? "where.exe" : "which",
        ["curl"],
        { stdio: "ignore", shell: true },
      );
      const hasCurl = proc.status === 0;

      if (hasCurl) {
        const curl = spawnSync("curl", ["-s", `${baseURL}/api/tags`], {
          encoding: "utf-8" as const,
          timeout: 5000,
          shell: true,
          windowsHide: true,
        });
        if (curl.status === 0 && curl.stdout) {
          const parsed = JSON.parse(curl.stdout);
          // Per Ollama API docs: GET /api/tags returns { models: Array<{ name: string, ... }> }
          const models: Array<{ name: string }> = parsed.models ?? [];
          return models.map((m: { name: string }) => m.name).filter(Boolean);
        }
      }
    } catch {
      // Fall through
    }
    return [];
  }

  /** List models via OpenAI-compatible proxy: GET /v1/models */
  private async listOpenAiCompatibleModels(baseURL: string, apiKey: string): Promise<string[]> {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: apiKey || "not-needed", baseURL });

      const list = await client.models.list();
      const data: Array<{ id: string }> = (list as any).data ?? [];
      return data.map((m) => m.id).filter(Boolean);
    } catch {
      return [];
    }
  }

  private hasOllama(): boolean {
    try {
      const cmd = process.platform === "win32" ? "where ollama" : "which ollama";
      spawnSync(cmd, { stdio: "ignore", shell: true });
      return true;
    } catch {
      return false;
    }
  }

  private runViaOllamaCli(request: ProviderRequest, model: string): ProviderResponse {
    const contextParts = request.context ?? [];
    const fullPrompt = [
      ...(contextParts.length > 0 ? ["Context:", ...contextParts, "---"] : []),
      request.prompt,
    ].join("\n\n");

    try {
      const proc = spawnSync("ollama", ["run", model], {
        input: fullPrompt,
        timeout: request.maxTokens ? Math.min(request.maxTokens * 10 + 30000, 120000) : 120000,
        encoding: "utf-8" as const,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        windowsHide: true,
      });

      if (proc.error) throw proc.error;
      if (proc.status !== 0) {
        throw new Error(`ollama exit code ${proc.status}: ${proc.stderr?.trim() || "unknown"}`);
      }

      const content = (proc.stdout || "").replace(/\r\n/g, "\n").trim();
      const tokensUsed = Math.ceil(content.length / 3.75);

      return { content, tokensUsed, model };
    } catch (err) {
      throw new Error(
        `LocalProvider (ollama) failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async runViaApi(
    request: ProviderRequest,
    model: string,
    backend: string,
  ): Promise<ProviderResponse> {
    const baseURL = this.getBaseURL(backend);
    const apiKey = this.options?.apiKey || "not-needed";

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
          "LocalProvider: openai package not installed and ollama CLI not available. " +
          "Run: npm install openai, or install ollama from https://ollama.com",
        );
      } else if (
        err instanceof Error &&
        (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed"))
      ) {
        throw new Error(
          `LocalProvider: Cannot connect to ${baseURL}. Make sure your local AI server is running.`,
        );
      }
      throw err;
    }
  }
}
