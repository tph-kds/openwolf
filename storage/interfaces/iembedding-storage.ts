import type { StorageEntry, EmbeddingMetadata, EmbeddingRecord } from "./storage-types.js";

export interface IEmbeddingStorage {
  /** Persist an embedding vector together with its metadata */
  save(record: EmbeddingRecord): Promise<void>;

  /** Load a stored embedding by file path */
  load(path: string): Promise<StorageEntry<EmbeddingMetadata> | null>;

  /** Remove an embedding entry */
  invalidate(path: string): Promise<void>;

  /** List every stored embedding */
  list(): Promise<StorageEntry<EmbeddingMetadata>[]>;

  /** Look up embeddings that were produced by a specific model */
  findByModel(model: string): Promise<StorageEntry<EmbeddingMetadata>[]>;

  /** Return the total number of stored embeddings */
  count(): Promise<number>;
}
