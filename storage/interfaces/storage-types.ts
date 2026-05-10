export type Resolution = "repo" | "module" | "file" | "block";

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface Versioned {
  version: number;
}

export interface Hashable {
  hash: string;
}

export interface StorageEntry<TMeta = Record<string, never>>
  extends Timestamped,
    Versioned,
    Hashable {
  key: string;
  data: unknown;
  metadata: TMeta;
}

// ─── Summary ────────────────────────────────────────

export interface SummaryMetadata extends Timestamped, Versioned, Hashable {
  path: string;
  resolution: Resolution;
  summary: string;
}

// ─── Cache ──────────────────────────────────────────

export interface CacheEntryMeta {
  key: string;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  ttlMs: number;
}

// ─── Embedding ──────────────────────────────────────

export interface EmbeddingMetadata extends Timestamped, Versioned {
  path: string;
  embeddingModel: string;
  vectorDimension: number;
}

export interface EmbeddingRecord extends EmbeddingMetadata {
  vector: number[];
}

// ─── Telemetry ──────────────────────────────────────

export interface TelemetryEvent {
  timestamp: string;
  sessionId: string;
  eventType: string;
  durationMs?: number;
  tokensUsed?: number;
  cacheHit?: boolean;
  data: Record<string, unknown>;
}

export interface TelemetrySnapshot {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  events: TelemetryEvent[];
  aggregates: {
    totalEvents: number;
    totalDurationMs: number;
    totalTokens: number;
    cacheHitRate: number;
  };
}

// ─── Graph ──────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: "module" | "file" | "class" | "function" | "dependency" | "architecture";
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type:
    | "imports"
    | "extends"
    | "implements"
    | "calls"
    | "depends_on"
    | "contains"
    | "references";
  metadata: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: Record<string, unknown>;
}

// ─── Cache Stats ────────────────────────────────────

export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  expiredCount: number;
}
