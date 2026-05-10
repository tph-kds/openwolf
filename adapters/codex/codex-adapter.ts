import * as path from "node:path";
import * as fs from "node:fs";
import type {
  IRuntimeAdapter, RuntimeEvent, ContextInjection,
} from "@openwolf/interfaces";

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeText(filePath: string, content: string): void {
  const tmp = filePath + "." + Math.random().toString(36).slice(2, 8) + ".tmp";
  try {
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, filePath);
  } catch {
    try { fs.writeFileSync(filePath, content, "utf-8"); } catch {}
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function readText(filePath: string, fallback = ""): string {
  try { return fs.readFileSync(filePath, "utf-8"); } catch { return fallback; }
}

// ─── Embedded Templates ────────────────────────────────────

const CODEX_OPENWOLF_PROTOCOL = `# OpenWolf Operating Protocol

This project uses OpenWolf for AI context management. These rules apply every session.

## File Navigation — Check Anatomy Before Every Read

Before reading any project file:
1. Check \`.wolf/anatomy.md\` — it contains descriptions and token estimates for tracked files.
2. If the description is sufficient, skip reading the full file.
3. If a file isn't in anatomy.md, search for it first (grep/glob), then add it after reading.

## Code Generation — Check Cerebrum Before Every Write

Before writing or editing any code:
1. Read \`.wolf/cerebrum.md\` — cross-session memory of preferences, learnings, and past mistakes.
2. Check the **## Do-Not-Repeat** section for known anti-patterns.
3. Check **## User Preferences** for project conventions.
4. Check **## Key Learnings** for architecture and design decisions.

## After Changes — Maintain State

After creating, editing, or deleting any file:
1. **Update \`.wolf/anatomy.md\`** — add or update the file's entry with description and token estimate.
2. **Append to \`.wolf/memory.md\`** — one-line summary of the action.

## Bug Logging — Mandatory

Log bugs to \`.wolf/buglog.json\` when:
- You encounter or fix an error, bug, or test failure
- You edit a file more than twice (that pattern IS a bug)
- A build or runtime error occurs

Before fixing: read buglog.json for known fixes.
After fixing: append entry with error_message, root_cause, fix, and tags.

## Learn Continuously

Update \`.wolf/cerebrum.md\` after every correction, discovery, or user preference. Low threshold — a redundant entry costs nothing, a missing entry means the next session repeats the discovery.

## Token Discipline

- Never re-read a file already read this session unless modified.
- Prefer anatomy.md descriptions over full file reads.
- Prefer targeted grep/glob over full reads when searching.
`;

const CODEX_RULES_CONTENT = `# OpenWolf Rules for Codex CLI

## Required Behaviors
1. Check .wolf/anatomy.md before reading any project file
2. Check .wolf/cerebrum.md Do-Not-Repeat list before generating code
3. Update .wolf/anatomy.md and .wolf/memory.md after every file change
4. Log every bug or error to .wolf/buglog.json
5. Update .wolf/cerebrum.md when learning new project conventions
6. Before fixing bugs, search .wolf/buglog.json for past occurrences and solutions
7. If you edit a file 3+ times in a session, that indicates a bug — log it
`;

const CODEX_MD_SNIPPET = `# OpenWolf

@.wolf/cerebrum.md
@.wolf/anatomy.md

This project uses OpenWolf for context management. Before any action, read the OpenWolf protocol in .codex/openwolf.md. Maintain .wolf/ state files throughout the session.`;

// ─── Adapter ───────────────────────────────────────────────

/**
 * OpenAI Codex CLI runtime adapter.
 *
 * Codex CLI doesn't have stdin/stderr hook events like Claude Code.
 * Instead, this adapter integrates via configuration files and
 * a project-level operating protocol that Codex can read at session start.
 *
 * Integration points:
 * - .codex/openwolf.md — detailed OpenWolf operating protocol
 * - .codex/rules/ — behavioral rules Codex follows
 * - .codex/guides/ — reference files for anatomy/cerebrum checks
 * - $CODEX_PROJECT_DIR env var detection
 */
export class CodexAdapter implements IRuntimeAdapter {
  readonly name = "codex";

  getProjectDir(): string {
    return process.env.CODEX_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  }

  getWolfDir(): string {
    return path.join(this.getProjectDir(), ".wolf");
  }

  /** Codex CLI doesn't emit structured JSON events on stdin.
   *  Hook-equivalent functionality is achieved through the
   *  operating protocol file that Codex reads at session start. */
  readEvent(_source: string): RuntimeEvent {
    throw new Error(
      "Codex adapter uses a declarative operating protocol (.codex/openwolf.md), " +
      "not stdin event hooks. No runtime events to read.",
    );
  }

  /** Format a ContextInjection for Codex CLI output. */
  formatOutput(result: ContextInjection): string {
    const prefix = result.type === "warning"
      ? "[OpenWolf Warning]"
      : result.type === "error"
        ? "[OpenWolf Error]"
        : "[OpenWolf]";

    const tokenInfo = result.tokens ? ` (~${result.tokens} tokens)` : "";
    return `${prefix} ${result.message}${tokenInfo}\n`;
  }

  /** Install Codex-specific configuration for OpenWolf integration. */
  async install(projectRoot: string): Promise<void> {
    const codexDir = path.join(projectRoot, ".codex");
    ensureDir(codexDir);
    ensureDir(path.join(codexDir, "rules"));

    // ── OpenWolf operating protocol ──
    writeText(path.join(codexDir, "openwolf.md"), CODEX_OPENWOLF_PROTOCOL);

    // ── Codex rules ──
    writeText(path.join(codexDir, "rules", "openwolf.md"), CODEX_RULES_CONTENT);

    // ── .codex.md (or CODEX.md) snippet ──
    const codexMdPath = path.join(projectRoot, "CODEX.md");
    if (fs.existsSync(codexMdPath)) {
      const existing = readText(codexMdPath);
      if (!existing.includes("OpenWolf")) {
        writeText(codexMdPath, CODEX_MD_SNIPPET + "\n\n" + existing);
      }
    } else {
      writeText(codexMdPath, CODEX_MD_SNIPPET);
    }
  }
}
