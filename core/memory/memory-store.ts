import * as fs from "node:fs";
import * as path from "node:path";

export function getMemoryPath(wolfDir: string): string {
  return path.join(wolfDir, "memory.md");
}

export function appendMemoryEntry(wolfDir: string, line: string): void {
  const memPath = getMemoryPath(wolfDir);
  const dir = path.dirname(memPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(memPath, line, "utf-8");
}

export function getCerebrumPath(wolfDir: string): string {
  return path.join(wolfDir, "cerebrum.md");
}

export function readCerebrum(wolfDir: string): string {
  try {
    return fs.readFileSync(getCerebrumPath(wolfDir), "utf-8");
  } catch {
    return "";
  }
}

export function getCerebrumAgeHours(wolfDir: string): number {
  try {
    const stat = fs.statSync(getCerebrumPath(wolfDir));
    return (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
  } catch {
    return Infinity;
  }
}

export function countCerebrumEntries(wolfDir: string): number {
  try {
    const content = fs.readFileSync(getCerebrumPath(wolfDir), "utf-8");
    return content.split("\n").filter((l) => {
      const t = l.trim();
      return t.startsWith("- ") || t.startsWith("* ") || (t.startsWith("[") && t.includes("]"));
    }).length;
  } catch {
    return 0;
  }
}
