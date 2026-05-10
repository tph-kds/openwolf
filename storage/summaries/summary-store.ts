import type { ISummaryStorage } from "../interfaces/isummary-storage.js";
import type { StorageEntry, SummaryMetadata, Resolution } from "../interfaces/storage-types.js";
import type { IPersistenceProvider } from "../interfaces/ipersistence-provider.js";
import type { IInvalidator } from "../interfaces/iinvalidator.js";
import { PersistenceProvider } from "../utils/persistence-provider.js";
import { Invalidator } from "../utils/invalidator.js";

export interface SummaryStoreOptions {
  /** Root directory under which the "summaries" sub-dir is created */
  basePath: string;
}

/**
 * Filesystem-backed summary store.
 *
 * Summaries are persisted as individual JSON files inside
 * `{basePath}/summaries/`, keyed by `{resolution}:{path}`.
 */
export class SummaryStore implements ISummaryStorage {
  private readonly store: IPersistenceProvider;
  private readonly invalidator: IInvalidator;

  constructor(options: SummaryStoreOptions) {
    this.store = new PersistenceProvider({
      basePath: options.basePath,
      subDir: "summaries",
    });
    this.invalidator = new Invalidator();
  }

  // ─── Public API ────────────────────────────────────

  async save(
    path: string,
    summary: string,
    hash: string,
    resolution: Resolution,
  ): Promise<void> {
    const key = this.entryKey(path, resolution);
    const now = new Date().toISOString();

    const metadata: SummaryMetadata = {
      path,
      resolution,
      summary,
      createdAt: now,
      updatedAt: now,
      version: 1,
      hash,
    };

    // Preserve original createdAt and bump version if re-saving
    const existing = await this.store.load<SummaryMetadata>(key);
    if (existing) {
      metadata.createdAt = existing.metadata.createdAt;
      metadata.version = existing.metadata.version + 1;
    }

    await this.store.save(key, { summary, hash }, metadata);
  }

  async load(
    path: string,
    resolution: Resolution,
  ): Promise<StorageEntry<SummaryMetadata> | null> {
    const key = this.entryKey(path, resolution);
    return this.store.load<SummaryMetadata>(key);
  }

  async invalidate(path: string, resolution: Resolution): Promise<void> {
    const key = this.entryKey(path, resolution);
    await this.store.delete(key);
  }

  async invalidateByResolution(resolution: Resolution): Promise<void> {
    const entries = await this.store.list<SummaryMetadata>();
    const prefix = `${resolution}:`;

    for (const entry of entries) {
      if (entry.key.startsWith(prefix)) {
        await this.store.delete(entry.key);
      }
    }
  }

  async list(): Promise<StorageEntry<SummaryMetadata>[]> {
    return this.store.list<SummaryMetadata>();
  }

  async isStale(
    path: string,
    resolution: Resolution,
    currentHash: string,
  ): Promise<boolean> {
    const entry = await this.load(path, resolution);
    if (!entry) return true;
    return entry.hash !== currentHash;
  }

  async count(): Promise<number> {
    return this.store.count();
  }

  // ─── Internal helpers ──────────────────────────────

  /**
   * Produce a deterministic key string that encodes both the
   * path and the resolution so the same file path can coexist
   * at multiple resolutions.
   */
  private entryKey(path: string, resolution: Resolution): string {
    const normalizedPath = path.replace(/\\/g, "/");
    return `${resolution}:${normalizedPath}`;
  }
}
