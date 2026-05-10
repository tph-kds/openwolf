import { readCerebrum, getCerebrumPath } from "./memory-store.js";

export interface CerebrumWarning {
  entry: string;
  matchedPattern: string;
}

export function getDoNotRepeatEntries(wolfDir: string): string[] {
  const cerebrumContent = readCerebrum(wolfDir);
  const doNotRepeatSection = cerebrumContent.split("## Do-Not-Repeat")[1];
  if (!doNotRepeatSection) return [];

  const entries = doNotRepeatSection.split("## ")[0];
  return entries
    .split("\n")
    .filter((l) => l.trim().startsWith("[") || l.trim().startsWith("-"))
    .map((l) => l.trim().replace(/^[-*]\s*/, "").replace(/^\[[\d-]+\]\s*/, ""));
}

export function checkContent(wolfDir: string, content: string): CerebrumWarning[] {
  const warnings: CerebrumWarning[] = [];
  const entries = getDoNotRepeatEntries(wolfDir);

  for (const entry of entries) {
    if (!entry) continue;

    const patterns: string[] = [];
    const quotedMatches = entry.match(/"([^"]+)"/g) || entry.match(/'([^']+)'/g) || entry.match(/`([^`]+)`/g);
    if (quotedMatches) {
      for (const qm of quotedMatches) {
        patterns.push(qm.replace(/["'`]/g, ""));
      }
    }

    const neverMatch = entry.match(/(?:never use|avoid|don't use|do not use)\s+(\w+)/i);
    if (neverMatch) patterns.push(neverMatch[1]);

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(content)) {
          warnings.push({ entry, matchedPattern: pattern });
        }
      } catch {
        // Invalid regex pattern — skip
      }
    }
  }

  return warnings;
}
