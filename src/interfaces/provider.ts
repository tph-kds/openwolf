export interface ProviderRequest {
  prompt: string;
  context?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface IProviderAdapter {
  readonly name: string;
  /** Models known to be available (populated lazily by listModels()). */
  models: string[];
  /**
   * Send a prompt to the AI model and return the response.
   * The `model` field in the request is used if set; otherwise the provider's default model is used.
   */
  run(request: ProviderRequest): Promise<ProviderResponse>;
  /**
   * Fetch available models from the provider API (or CLI) and cache them in `this.models`.
   * Returns the list of model IDs. May return a fallback list if the API is unreachable.
   */
  listModels(options?: { forceRefresh?: boolean }): Promise<string[]>;
}
