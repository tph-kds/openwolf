export interface MemoryEntry {
  id: string;
  type: 'bug' | 'decision' | 'convention' | 'learning' | 'architecture';
  timestamp: string;
  content: string;
  confidence: number;
  validatedAt?: string;
  tags: string[];
}

export interface MemoryQuery {
  type?: MemoryEntry['type'];
  tags?: string[];
  filePattern?: string;
  since?: string;
}

export interface ConfidenceScore {
  entry: MemoryEntry;
  score: number;
  factors: {
    freshness: number;
    validationAge: number;
    architecturalAlignment: number;
  };
}

export interface IMemoryStore {
  add(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry>;
  query(params: MemoryQuery): Promise<MemoryEntry[]>;
  invalidate(id: string): Promise<void>;
  validate(id: string): Promise<void>;
  getConfidence(id: string): Promise<ConfidenceScore>;
}
