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
  readonly models: string[];
  run(request: ProviderRequest): Promise<ProviderResponse>;
}
