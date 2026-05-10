import type { StorageEntry, SummaryMetadata, Resolution } from "./storage-types.js";

export interface ISummaryStorage {
  /** Persist a summary at a given path and resolution level */
  save(
    path: string,
    summary: string,
    hash: string,
    resolution: Resolution,
  ): Promise<void>;

  /** Load a previously persisted summary */
  load(
    path: string,
    resolution: Resolution,
  ): Promise<StorageEntry<SummaryMetadata> | null>;

  /** Remove a specific summary entry */
  invalidate(path: string, resolution: Resolution): Promise<void>;

  /** Remove all summaries at a given resolution level */
  invalidateByResolution(resolution: Resolution): Promise<void>;

  /** List all stored summaries */
  list(): Promise<StorageEntry<SummaryMetadata>[]>;

  /** Check whether a stored summary is stale compared to a current hash */
  isStale(
    path: string,
    resolution: Resolution,
    currentHash: string,
  ): Promise<boolean>;

  /** Return the total number of stored summaries */
  count(): Promise<number>;
}
