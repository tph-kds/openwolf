import type { CacheStats } from "./storage-types.js";

export interface ISemanticCache {
  /** Store a value with an optional TTL in milliseconds */
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;

  /** Retrieve a value by key. Returns null on cache miss or expiry. */
  get<T = unknown>(key: string): Promise<T | null>;

  /** Remove a specific cache entry */
  invalidate(key: string): Promise<void>;

  /** Remove all entries whose key starts with the given prefix */
  invalidateByPrefix(prefix: string): Promise<void>;

  /** Purge all expired entries. Returns the count of removed entries. */
  cleanupExpired(): Promise<number>;

  /** Remove every entry */
  clear(): Promise<void>;

  /** Return current cache performance statistics */
  stats(): Promise<CacheStats>;
}
