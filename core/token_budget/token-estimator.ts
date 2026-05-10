import * as path from "node:path";

const CODE_EXTS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".py", ".rs", ".go", ".java",
  ".c", ".cpp", ".h", ".css", ".scss", ".sql", ".sh", ".yaml",
  ".yml", ".json", ".toml", ".xml",
]);

const PROSE_EXTS = new Set([".md", ".txt", ".rst", ".adoc"]);

export type ContentType = "code" | "prose" | "mixed";

export function detectContentType(filePath: string): ContentType {
  const ext = path.extname(filePath).toLowerCase();
  if (CODE_EXTS.has(ext)) return "code";
  if (PROSE_EXTS.has(ext)) return "prose";
  return "mixed";
}

export function estimateTokens(
  text: string,
  type: ContentType = "mixed"
): number {
  const ratio = type === "code" ? 3.5 : type === "prose" ? 4.0 : 3.75;
  return Math.ceil(text.length / ratio);
}
