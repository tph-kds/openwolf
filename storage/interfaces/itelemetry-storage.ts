import type { TelemetryEvent, TelemetrySnapshot } from "./storage-types.js";

export interface ITelemetryStorage {
  /** Append a single telemetry event to the log */
  append(event: TelemetryEvent): Promise<void>;

  /** Retrieve events within a time window */
  query(since: string, until?: string): Promise<TelemetryEvent[]>;

  /** Get a snapshot of every event recorded for a given session */
  getSessionSnapshot(sessionId: string): Promise<TelemetrySnapshot | null>;

  /** List all session IDs that have recorded telemetry */
  listSessions(): Promise<string[]>;

  /** Compute lightweight aggregates across all stored data */
  aggregate(): Promise<{
    totalEvents: number;
    totalTokens: number;
    cacheHitRate: number;
    avgDurationMs: number;
    sessionCount: number;
  }>;

  /** Remove events older than the given timestamp. Returns count pruned. */
  prune(before: string): Promise<number>;
}
