/**
 * Ambient declarations for optional SDK dependencies.
 * These packages are NOT required — each provider handles
 * missing imports via try/catch at runtime.
 *
 * Install the desired package when you need that provider:
 *   npm install @anthropic-ai/sdk   # AnthropicProvider
 *   npm install openai              # OpenAIProvider, DeepSeekProvider, LocalProvider
 *   npm install @google/generative-ai # GoogleProvider
 */

// ── Anthropic SDK ─────────────────────────────────────────
declare module "@anthropic-ai/sdk" {
  export class Anthropic {
    constructor(opts: { apiKey?: string });

    messages: {
      create(req: {
        model: string;
        max_tokens: number;
        temperature: number;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
      }): Promise<{
        content: Array<{ type: string; text: string }>;
        model: string;
        usage?: { input_tokens: number; output_tokens: number };
      }>;
    };

    /** List available models: GET /v1/models */
    models: {
      list(opts?: Record<string, unknown>): Promise<{
        data: Array<{
          id: string;
          type: string;
          display_name?: string;
          created_at?: string;
        }>;
        has_more?: boolean;
      }>;
    };
  }
}

// ── OpenAI SDK ────────────────────────────────────────────
declare module "openai" {
  export default class OpenAI {
    constructor(opts: { apiKey?: string; baseURL?: string });

    chat: {
      completions: {
        create(req: {
          model: string;
          max_tokens?: number;
          temperature?: number;
          messages: Array<{ role: "user" | "system"; content: string }>;
        }): Promise<{
          choices: Array<{ message?: { content?: string } }>;
          model: string;
          usage?: { total_tokens: number };
        }>;
      };
    };

    /** List available models: GET /v1/models */
    models: {
      list(): Promise<{
        data: Array<{ id: string; object: string; created: number; owned_by: string }>;
      }>;
    };
  }
}

// ── Google Generative AI SDK ──────────────────────────────
declare module "@google/generative-ai" {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);

    getGenerativeModel(opts: { model: string }): GenerativeModel;

    /** List available models: GET /v1/models */
    listModels(): Promise<{
      models: Array<{
        name: string;
        version?: string;
        displayName?: string;
        description?: string;
        inputTokenLimit?: number;
        outputTokenLimit?: number;
        supportedGenerationMethods?: string[];
      }>;
    }>;
  }

  export interface GenerativeModel {
    generateContent(req: {
      contents: Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
      };
    }): Promise<GenerateContentResult>;
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
      usageMetadata?: { totalTokenCount: number };
    };
  }
}
