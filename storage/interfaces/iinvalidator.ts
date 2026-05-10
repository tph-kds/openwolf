export interface IInvalidator {
  /** Compute a deterministic content hash from a string */
  hash(data: string): string;

  /** Compute a hash from any JSON-serializable value */
  hashJSON(data: unknown): string;

  /** Return true when an entry created at the given time has exceeded its TTL */
  isExpired(createdAt: string, ttlMs: number): boolean;

  /** Return true when the current content differs from the stored hash */
  hasChanged(currentData: string, storedHash: string): boolean;

  /** Return true when an entry last updated at the given time should be regenerated */
  shouldRegenerate(updatedAt: string, maxAgeMs: number): boolean;
}
