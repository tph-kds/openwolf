import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import type { IProviderAdapter, ProviderRequest, ProviderResponse } from "@openwolf/interfaces";

/**
 * Anthropic Claude provider — sends AI tasks to Claude via the `claude` CLI
 * or the Anthropic SDK.
 *
 * Models are fetched dynamically from the API (SDK or CLI) and cached.
 * If no API is reachable, a curated fallback list is used.
 *
 * ## CLI mode (default)
 * Uses `claude -p` with stdin piping. No API key needed when
 * Claude is authenticated via OAuth. Models listed via `claude models list`.
 *
 * ## SDK mode
 * If ANTHROPIC_API_KEY is set, uses `@anthropic-ai/sdk` directly.
 * Models listed via `client.models.list()` per Anthropic API docs.
 *
 * ## Provider docs
 * - Models API: https://docs.anthropic.com/en/api/models-list
 * - Messages API: https://docs.anthropic.com/en/api/messages
 * - SDK: https://github.com/anthropics/anthropic-sdk-typescript
 */
export class AnthropicProvider implements IProviderAdapter {
  readonly name = "anthropic";

  /** Models known to be available. Populated lazily by listModels(). */
  models: string[] = [];

  /** Fallback used when no API is reachable (SDK absent, CLI absent). */
  private static readonly MODEL_FALLBACKS = [
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
    "claude-3-opus-latest",
  ];

  constructor(private options?: { preferCli?: boolean; model?: string }) {}

  async run(request: ProviderRequest): Promise<ProviderResponse> {
    const model = this.options?.model || "claude-sonnet-4-20250514";

    if (this.options?.preferCli !== false && this.hasClaude()) {
      return this.runViaCli(request, model);
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return this.runViaSdk(request, model);
    }

    if (this.hasClaude()) {
      return this.runViaCli(request, model);
    }

    throw new Error(
      "AnthropicProvider: No API key (ANTHROPIC_API_KEY) found and `claude` CLI is not installed. " +
      "Set ANTHROPIC_API_KEY or install the Claude CLI from https://claude.ai/download.",
    );
  }

  async listModels(options?: { forceRefresh?: boolean }): Promise<string[]> {
    if (this.models.length > 0 && !options?.forceRefresh) return this.models;

    // Try SDK first
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await this.listModelsViaSdk();
        if (result.length > 0) {
          this.models = result;
          return result;
        }
      } catch {
        // Fall through to CLI
      }
    }

    // Try CLI
    if (this.hasClaude()) {
      try {
        const result = this.listModelsViaCli();
        if (result.length > 0) {
          this.models = result;
          return result;
        }
      } catch {
        // Fall through to fallback
      }
    }

    this.models = [...AnthropicProvider.MODEL_FALLBACKS];
    return this.models;
  }

  private hasClaude(): boolean {
    try {
      const cmd = process.platform === "win32" ? "where claude" : "which claude";
      spawnSync(cmd, { stdio: "ignore", shell: true });
      return true;
    } catch {
      return false;
    }
  }

  private runViaCli(request: ProviderRequest, model: string): ProviderResponse {
    const contextParts: string[] = [];
    for (const ctx of request.context ?? []) {
      contextParts.push(ctx);
    }

    const fullPrompt = [
      ...(contextParts.length ? contextParts : []),
      request.prompt,
    ].join("\n\n---\n\n");

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    try {
      const proc = spawnSync("claude", ["-p", "--output-format", "text"], {
        input: fullPrompt,
        timeout: request.maxTokens ? Math.min(request.maxTokens * 10 + 30000, 120000) : 120000,
        encoding: "utf-8" as const,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        windowsHide: true,
      });

      if (proc.error) throw proc.error;
      if (proc.status !== 0) {
        const stderr = proc.stderr?.trim();
        throw new Error(`claude CLI exit code ${proc.status}: ${stderr || "unknown error"}`);
      }

      let content = (proc.stdout || "").replace(/\r\n/g, "\n").trim();
      const fenceMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
      if (fenceMatch) content = fenceMatch[1].trim();

      return {
        content,
        tokensUsed: Math.ceil(content.length / 3.75),
        model,
      };
    } catch (err) {
      throw new Error(
        `AnthropicProvider CLI failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async runViaSdk(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    try {
      const { Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
      const contextParts = request.context ?? [];
      const fullContent = [
        ...(contextParts.length > 0 ? ["Context:", ...contextParts, "---"] : []),
        request.prompt,
      ].join("\n");

      messages.push({ role: "user", content: fullContent });

      const response = await client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages,
      });

      const content = response.content
        .filter((b: { type: string; text: string }): b is { type: "text"; text: string } => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("\n");

      return {
        content,
        tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
        model: response.model,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Cannot find module")) {
        if (this.hasClaude()) {
          return this.runViaCli(request, model);
        }
        throw new Error(
          "AnthropicProvider: @anthropic-ai/sdk not installed and `claude` CLI not available. " +
          "Run: npm install @anthropic-ai/sdk",
        );
      }
      throw err;
    }
  }

  private async listModelsViaSdk(): Promise<string[]> {
    const { Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.models.list({});
    // Anthropic SDK returns paginated models with { data: Array<{ id: string, ... }> }
    const data: Array<{ id: string }> = (response as any).data ?? [];
    return data.map((m: { id: string }) => m.id).filter(Boolean);
  }

  private listModelsViaCli(): string[] {
    const proc = spawnSync("claude", ["models", "list"], {
      encoding: "utf-8" as const,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsHide: true,
    });

    if (proc.status !== 0) return [];

    // Parse CLI output — typically one model per line or JSON
    const output = (proc.stdout || "").trim();
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Try JSON first
    if (lines.length === 1 && (lines[0].startsWith("[") || lines[0].startsWith("{"))) {
      try {
        const parsed = JSON.parse(lines[0]);
        const raw = Array.isArray(parsed) ? parsed : (parsed as any).data ?? (parsed as any).models ?? [];
        return raw.map((m: any) => m.id ?? m.name ?? m).filter(Boolean);
      } catch {
        // Not valid JSON, continue to line parsing
      }
    }

    // Filter header rows and known non-model output
    return lines.filter(
      (l) => l && !l.startsWith("Name") && !l.startsWith("---") && !l.includes("Models available"),
    );
  }
}
