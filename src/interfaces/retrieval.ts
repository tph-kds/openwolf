export type Resolution = 'repo' | 'module' | 'file' | 'block';

export interface ContextRequest {
  filePath: string;
  resolution: Resolution;
  maxTokens?: number;
}

export interface ContextResult {
  content: string;
  resolution: Resolution;
  tokens: number;
  fromCache: boolean;
  confidence: number;
}

export interface IRetrievalEngine {
  retrieve(request: ContextRequest): Promise<ContextResult>;
  getCacheStats(): { hits: number; misses: number; hitRate: number };
}
