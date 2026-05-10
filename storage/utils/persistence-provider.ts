import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { IPersistenceProvider } from "../interfaces/ipersistence-provider.js";
import type { StorageEntry } from "../interfaces/storage-types.js";
import { Invalidator } from "./invalidator.js";
import type { IInvalidator } from "../interfaces/iinvalidator.js";

export interface PersistenceProviderOptions {
  /** Root directory under which the store's sub-directory lives */
  basePath: string;
  /** Sub-directory name unique to this store (e.g. "summaries", "cache") */
  subDir: string;
}

/**
 * Filesystem-backed key-value store.
 *
 * Each entry is persisted as a separate JSON file inside
 * `{basePath}/{subDir}/`.  File names are a sanitised version
 * of the entry key so that any string can be used as a key.
 */
export class PersistenceProvider implements IPersistenceProvider {
  private readonly storePath: string;
  private readonly invalidator: IInvalidator;

  constructor(options: PersistenceProviderOptions) {
    this.storePath = path.join(options.basePath, options.subDir);
    this.invalidator = new Invalidator();

    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  // ─── Public API ────────────────────────────────────

  async save<TMeta = Record<string, never>>(
    key: string,
    data: unknown,
    metadata?: TMeta,
  ): Promise<void> {
    const now = new Date().toISOString();
    const dataHash = this.invalidator.hashJSON(data);

    const entry: StorageEntry<TMeta> = {
      key,
      data,
      metadata: (metadata ?? {}) as TMeta,
      createdAt: now,
      updatedAt: now,
      version: 1,
      hash: dataHash,
    };

    // Preserve createdAt & bump version when re-saving an existing key
    const existing = this.readEntrySync<TMeta>(key);
    if (existing) {
      entry.createdAt = existing.createdAt;
      entry.version = existing.version + 1;
    }

    this.writeEntrySync(key, entry);
  }

  async load<TMeta = Record<string, never>>(
    key: string,
  ): Promise<StorageEntry<TMeta> | null> {
    return this.readEntrySync<TMeta>(key);
  }

  async delete(key: string): Promise<void> {
    const fp = this.entryPath(key);
    try {
      fs.unlinkSync(fp);
    } catch {
      // Not-found is a no-op
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.entryPath(key));
  }

  async list<TMeta = Record<string, never>>(): Promise<StorageEntry<TMeta>[]> {
    const entries: StorageEntry<TMeta>[] = [];
    try {
      const files = fs.readdirSync(this.storePath);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const fp = path.join(this.storePath, file);
        try {
          const raw = fs.readFileSync(fp, "utf-8");
          const entry = JSON.parse(raw) as StorageEntry<TMeta>;
          entries.push(entry);
        } catch {
          // Skip corrupt files
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
    return entries;
  }

  async count(): Promise<number> {
    try {
      const files = fs.readdirSync(this.storePath);
      return files.filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }

  /** Return the base storage directory path (useful for debugging). */
  getStorePath(): string {
    return this.storePath;
  }

  // ─── Internal helpers ──────────────────────────────

  private entryPath(key: string): string {
    // Keep forward-slashes so paths survive cross-platform, then
    // replace any character that is unsafe on Windows/Unix.
    const safe = key
      .replace(/\\/g, "/")
      .replace(/[<>:"|?*\x00-\x1f]/g, "_");
    return path.join(this.storePath, safe + ".json");
  }

  private readEntrySync<TMeta>(key: string): StorageEntry<TMeta> | null {
    const fp = this.entryPath(key);
    try {
      const raw = fs.readFileSync(fp, "utf-8");
      return JSON.parse(raw) as StorageEntry<TMeta>;
    } catch {
      return null;
    }
  }

  private writeEntrySync(key: string, entry: StorageEntry<unknown>): void {
    const fp = this.entryPath(key);
    const tmp = fp + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
    try {
      fs.writeFileSync(tmp, JSON.stringify(entry, null, 2), "utf-8");
      fs.renameSync(tmp, fp);
    } catch {
      // Fallback: direct write, then clean up tmp
      try {
        fs.writeFileSync(fp, JSON.stringify(entry, null, 2), "utf-8");
      } catch {
        // swallow
      }
      try {
        fs.unlinkSync(tmp);
      } catch {
        // swallow
      }
    }
  }
}
