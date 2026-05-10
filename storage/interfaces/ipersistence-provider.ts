import type { StorageEntry } from "./storage-types.js";

export interface IPersistenceProvider {
  /** Persist data under a key with associated metadata */
  save<TMeta = Record<string, never>>(
    key: string,
    data: unknown,
    metadata?: TMeta,
  ): Promise<void>;

  /** Load an entry by key. Returns null when not found. */
  load<TMeta = Record<string, never>>(
    key: string,
  ): Promise<StorageEntry<TMeta> | null>;

  /** Remove an entry by key */
  delete(key: string): Promise<void>;

  /** Check whether a key exists */
  exists(key: string): Promise<boolean>;

  /** List every stored entry */
  list<TMeta = Record<string, never>>(): Promise<StorageEntry<TMeta>[]>;

  /** Return the total number of stored entries */
  count(): Promise<number>;
}
