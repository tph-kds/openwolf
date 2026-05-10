import type { ISemanticCache } from "../interfaces/isemantic-cache.js";
import type { CacheStats, StorageEntry, CacheEntryMeta } from "../interfaces/storage-types.js";
import type { IPersistenceProvider } from "../interfaces/ipersistence-provider.js";
import type { IInvalidator } from "../interfaces/iinvalidator.js";
import { PersistenceProvider } from "../utils/persistence-provider.js";
import { Invalidator } from "../utils/invalidator.js";

/** Default TTL: 5 minutes. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export interface SemanticCacheOptions {
  /** Root directory under which the "cache" sub-dir is created */
  basePath: string;
}

/**
 * Filesystem-backed semantic cache with TTL-based expiry.
 *
 * On every get() the entry is silently deleted if its TTL has elapsed.
 * Use cleanupExpired() to batch-purge stale entries.
 */
export class SemanticCache implements ISemanticCache {
  private readonly store: IPersistenceProvider;
  private readonly invalidator: IInvalidator;

  /** In-memory miss counter (resets on process restart). */
  private missCount: number = 0;

  constructor(options: SemanticCacheOptions) {
    this.store = new PersistenceProvider({
      basePath: options.basePath,
      subDir: "cache",
    });
    this.invalidator = new Invalidator();
  }

  // ─── Public API ────────────────────────────────────

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? DEFAULT_TTL_MS;
    const now = Date.now();

    const meta: CacheEntryMeta = {
      key,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl).toISOString(),
      hitCount: 0,
      ttlMs: ttl,
    };

    await this.store.save(key, value, meta);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = await this.store.load<CacheEntryMeta>(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    const meta = entry.metadata;

    // Check expiry
    if (this.invalidator.isExpired(meta.createdAt, meta.ttlMs)) {
      await this.store.delete(key);
      this.missCount++;
      return null;
    }

    // Bump hit count and persist
    meta.hitCount++;
    const expiry = new Date(Date.now() + meta.ttlMs).toISOString();
    await this.store.save(key, entry.data, {
      ...meta,
      expiresAt: expiry,
    });

    return entry.data as T;
  }

  async invalidate(key: string): Promise<void> {
    await this.store.delete(key);
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    const entries = await this.store.list<CacheEntryMeta>();
    for (const entry of entries) {
      if (entry.key.startsWith(prefix)) {
        await this.store.delete(entry.key);
      }
    }
  }

  async cleanupExpired(): Promise<number> {
    const entries = await this.store.list<CacheEntryMeta>();
    let removed = 0;

    for (const entry of entries) {
      const { createdAt, ttlMs } = entry.metadata;
      if (this.invalidator.isExpired(createdAt, ttlMs)) {
        await this.store.delete(entry.key);
        removed++;
      }
    }

    return removed;
  }

  async clear(): Promise<void> {
    const entries = await this.store.list<CacheEntryMeta>();
    for (const entry of entries) {
      await this.store.delete(entry.key);
    }
  }

  async stats(): Promise<CacheStats> {
    const entries = await this.store.list<CacheEntryMeta>();

    let expiredCount = 0;
    let totalHits = 0;

    for (const entry of entries) {
      totalHits += entry.metadata.hitCount;
      if (this.invalidator.isExpired(entry.metadata.createdAt, entry.metadata.ttlMs)) {
        expiredCount++;
      }
    }

    const totalRequests = totalHits + this.missCount;
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      size: entries.length - expiredCount,
      hitCount: totalHits,
      missCount: this.missCount,
      hitRate,
      expiredCount,
    };
  }
}
