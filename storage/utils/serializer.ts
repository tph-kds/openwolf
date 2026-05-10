import * as crypto from "node:crypto";

/** Pretty-print JSON with 2-space indentation. */
export function serializeJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Parse JSON with a fallback default on failure. */
export function deserializeJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Compute a deterministic SHA-256 hex digest for a UTF-8 string. */
export function contentHash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

/** Serialize a number array to a compact, colon-delimited string. */
export function serializeVector(vector: number[], precision: number = 6): string {
  return vector.map((v) => v.toFixed(precision)).join(":");
}

/** Deserialize a colon-delimited string back into a number array. */
export function deserializeVector(raw: string): number[] {
  return raw.split(":").map(Number);
}
