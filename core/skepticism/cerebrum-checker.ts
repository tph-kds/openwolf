import * as fs from "node:fs";
import * as path from "node:path";

const STOP_WORDS = new Set([
  "error", "function", "return", "const", "this", "that", "with", "from",
  "import", "export", "class", "interface", "type", "undefined", "null",
  "true", "false", "string", "number", "object", "array", "value",
  "file", "path", "name", "data", "response", "request", "result",
  "should", "must", "does", "have", "been", "will", "would", "could",
  "when", "then", "else", "each", "some", "every", "only",
]);

export interface BugMatch {
  id: string;
  error_message: string;
  root_cause: string;
  fix: string;
  file: string;
  tags: string[];
}

export interface BugLogData {
  version: number;
  bugs: BugMatch[];
}

export function getBugLogPath(wolfDir: string): string {
  return path.join(wolfDir, "buglog.json");
}

export function readBugLogQuick(wolfDir: string): BugLogData {
  try {
    if (!fs.existsSync(getBugLogPath(wolfDir))) return { version: 1, bugs: [] };
    return JSON.parse(fs.readFileSync(getBugLogPath(wolfDir), "utf-8")) as BugLogData;
  } catch {
    return { version: 1, bugs: [] };
  }
}

function tokenize(text: string): Set<string> {
  return new Set(
    text.replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()))
      .map(w => w.toLowerCase())
  );
}

export function findRelevantBugs(
  wolfDir: string,
  filePath: string,
  editContent: string
): BugMatch[] {
  const bugLog = readBugLogQuick(wolfDir);
  if (bugLog.bugs.length === 0) return [];

  const basename = path.basename(filePath);

  const fileMatches = bugLog.bugs.filter(b => {
    const bugBasename = path.basename(b.file);
    return bugBasename === basename;
  });

  if (fileMatches.length === 0) return [];

  const editText = editContent.toLowerCase();
  const editTokens = tokenize(editContent);

  return fileMatches.filter(bug => {
    const tagHit = bug.tags.some(t => editText.includes(t.toLowerCase()));
    if (tagHit) return true;

    const bugTokens = tokenize(bug.error_message + " " + bug.root_cause);
    const overlap = [...editTokens].filter(t => bugTokens.has(t));
    return overlap.length >= 3;
  });
}
