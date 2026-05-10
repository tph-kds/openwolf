import * as crypto from "node:crypto";
import type { IInvalidator } from "../interfaces/iinvalidator.js";

export class Invalidator implements IInvalidator {
  hash(data: string): string {
    return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
  }

  hashJSON(data: unknown): string {
    const serialized = JSON.stringify(data);
    return crypto.createHash("sha256").update(serialized, "utf-8").digest("hex");
  }

  isExpired(createdAt: string, ttlMs: number): boolean {
    const created = new Date(createdAt).getTime();
    return Date.now() - created > ttlMs;
  }

  hasChanged(currentData: string, storedHash: string): boolean {
    return this.hash(currentData) !== storedHash;
  }

  shouldRegenerate(updatedAt: string, maxAgeMs: number): boolean {
    const updated = new Date(updatedAt).getTime();
    return Date.now() - updated > maxAgeMs;
  }
}
