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

const AGENT_SYSTEM_PROMPT = `You are working in an OpenWolf-managed project. OpenWolf provides persistent AI context management — it tracks files (anatomy), cross-session memory (cerebrum), action history (memory), and bug history (buglog).

## Operating Protocol

### File Navigation
- Before reading any file, check .wolf/anatomy.md for its description and token estimate.
- If the description is sufficient, don't read the full file.
- After reading a file not in anatomy.md, add it to the index.

### Code Generation
- Read .wolf/cerebrum.md before writing code. Check Do-Not-Repeat, User Preferences, and Key Learnings sections.
- Respect every entry — they represent past mistakes and learned conventions.

### State Maintenance
- After every file change: update .wolf/anatomy.md and append to .wolf/memory.md.
- After user corrections: update .wolf/cerebrum.md immediately.

### Bug Logging
- Log every bug, error, or test failure to .wolf/buglog.json.
- Before fixing: check buglog for known solutions. After fixing: append the fix.
- If you edit a file more than twice, that's a bug pattern — log it.

### Learning
- Low threshold for adding to cerebrum.md. A redundant entry is harmless; a missing one means the next session repeats work.
- Track preferences, project conventions, architecture decisions, and API quirks.
`;

const GENERIC_RULES_CONTENT = `# OpenWolf Generic Agent Rules

1. Always check .wolf/anatomy.md before reading any project file
2. Always check .wolf/cerebrum.md Do-Not-Repeat section before writing code
3. Update .wolf/anatomy.md and .wolf/memory.md after every file change
4. Log all bugs and errors to .wolf/buglog.json with root cause and fix
5. Update .wolf/cerebrum.md with new learnings after every user interaction
6. Before fixing a bug, check .wolf/buglog.json for past occurrences
`;

const AGENT_MD_SNIPPET = `# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Load and follow the OpenWolf operating protocol from OPENWOLF.md (in .wolf/) every session. Check cerebrum.md before generating code, anatomy.md before reading files, and buglog.json before fixing bugs.`;

// ─── Adapter ───────────────────────────────────────────────

/**
 * Generic runtime adapter for any AI coding agent that can read
 * configuration files and follow instructions from a project-level
 * protocol document.
 *
 * This is the most universal adapter — it doesn't depend on any
 * specific CLI's hook/event system. Instead, it provides:
 * - An operating protocol in .wolf/OPENWOLF.md (for all agents)
 * - A system prompt template (.wolf/agent-prompt.md) the agent can load
 * - Rules file (.wolf/agent-rules.md) with concise behavioral rules
 * - An agent instruction file (OPENWOLF.md in project root)
 *
 * Supported agents: Cursor, Windsurf, GitHub Copilot, Amazon Q,
 * Tabnine, Sourcegraph Cody, Continue.dev, and any agent
 * that reads project-level markdown instructions.
 */
export class GenericAdapter implements IRuntimeAdapter {
  readonly name = "generic";

  getProjectDir(): string {
    return process.cwd();
  }

  getWolfDir(): string {
    return path.join(process.cwd(), ".wolf");
  }

  /** Generic agents don't have stdin/stderr hook systems.
   *  All enforcement is via instruction files the agent reads. */
  readEvent(_source: string): RuntimeEvent {
    throw new Error(
      "Generic adapter uses declarative instruction files (.wolf/OPENWOLF.md, " +
      ".wolf/agent-prompt.md, .wolf/agent-rules.md), not stdin event hooks. " +
      "No runtime events to read.",
    );
  }

  /** Format a ContextInjection for generic agent output. */
  formatOutput(result: ContextInjection): string {
    const prefix = result.type === "warning"
      ? "⚠️ [OpenWolf Warning]"
      : result.type === "error"
        ? "❌ [OpenWolf Error]"
        : "📋 [OpenWolf]";

    const tokenInfo = result.tokens ? ` (~${result.tokens} tok)` : "";
    return `${prefix} ${result.message}${tokenInfo}\n`;
  }

  /** Install generic agent configuration files. */
  async install(projectRoot: string): Promise<void> {
    const wolfDir = path.join(projectRoot, ".wolf");

    // ── Agent operating protocol (for any agent that reads .wolf/ files) ──
    writeText(path.join(wolfDir, "agent-prompt.md"), AGENT_SYSTEM_PROMPT);

    // ── Agent behavioral rules ──
    writeText(path.join(wolfDir, "agent-rules.md"), GENERIC_RULES_CONTENT);

    // ── Project root instruction file ──
    // Many generic agents (Copilot, Cursor, Continue) read a project-level
    // instruction file. We support the common conventions.
    const rootInstruction = this.detectExistingInstructionFiles(projectRoot);
    if (!rootInstruction) {
      // Write a generic OPENWOLF.md that references the protocol
      const openwolfPath = path.join(projectRoot, "OPENWOLF.md");
      if (!fs.existsSync(openwolfPath)) {
        writeText(openwolfPath, AGENT_MD_SNIPPET);
      }
    }
  }

  /** Detect if the project already has an agent instruction file
   *  and inject OpenWolf reference if missing. Returns the found path. */
  private detectExistingInstructionFiles(projectRoot: string): string | null {
    const candidates = [
      ".cursorrules",
      ".windsurfrules",
      "INSTRUCTIONS.md",
      ".github/copilot-instructions.md",
      "CONTINUE.md",
      ".continue/config.json",
    ];

    for (const relPath of candidates) {
      const fullPath = path.join(projectRoot, relPath);
      if (fs.existsSync(fullPath)) {
        const content = readText(fullPath);
        if (!content.includes("OpenWolf")) {
          writeText(fullPath, AGENT_MD_SNIPPET + "\n\n" + content);
        }
        return fullPath;
      }
    }

    return null;
  }
}
