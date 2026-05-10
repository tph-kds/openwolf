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

function readJSON<T = unknown>(filePath: string, fallback: T): T {
  try { return JSON.parse(readText(filePath)) as T; } catch { return fallback; }
}

// ─── Hook Settings Template ────────────────────────────────

const HOOK_SETTINGS: Record<string, unknown> = {
  hooks: {
    SessionStart: [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/session-start.js"',
            timeout: 5,
          },
        ],
      },
    ],
    PreToolUse: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/pre-read.js"',
            timeout: 5,
          },
        ],
      },
      {
        matcher: "Write|Edit|MultiEdit",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/pre-write.js"',
            timeout: 5,
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/post-read.js"',
            timeout: 5,
          },
        ],
      },
      {
        matcher: "Write|Edit|MultiEdit",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/post-write.js"',
            timeout: 10,
          },
        ],
      },
    ],
    Stop: [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: 'node "$CLAUDE_PROJECT_DIR/.wolf/hooks/stop.js"',
            timeout: 10,
          },
        ],
      },
    ],
  },
};

// ─── Embedded Templates ────────────────────────────────────

const CLAUDE_MD_SNIPPET = `# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.`;

const RULES_CONTENT = `---
description: OpenWolf protocol enforcement — active on all files
globs: **/*
---

- Check .wolf/anatomy.md before reading any project file
- Check .wolf/cerebrum.md Do-Not-Repeat list before generating code
- After writing or editing files, update .wolf/anatomy.md and append to .wolf/memory.md
- After receiving a user correction, update .wolf/cerebrum.md immediately (Preferences, Learnings, or Do-Not-Repeat)
- LEARN from every interaction: if you discover a convention, user preference, or project pattern, add it to .wolf/cerebrum.md. Low threshold — when in doubt, log it.
- BEFORE fixing any bug or error: read .wolf/buglog.json for known fixes
- AFTER fixing any bug, error, failed test, failed build, or user-reported problem: ALWAYS log to .wolf/buglog.json with error_message, root_cause, fix, and tags
- If you edit a file more than twice in a session, that likely indicates a bug — log it to .wolf/buglog.json
- When the user asks to check/evaluate UI design: run \`openwolf designqc\` to capture screenshots, then read them from .wolf/designqc-captures/
- When the user asks to change/pick/migrate UI framework: read .wolf/reframe-frameworks.md, ask decision questions, recommend a framework, then execute with the framework's prompt
`;

// ─── Adapter ───────────────────────────────────────────────

export class ClaudeAdapter implements IRuntimeAdapter {
  readonly name = "claude";

  private hookScriptsDir = "";

  /** Set the path to compiled hook scripts (.js files from src/hooks/).
   *  Call before install() if hooks aren't in the default dist location. */
  setHookScriptsDir(dir: string): void {
    this.hookScriptsDir = dir;
  }

  getProjectDir(): string {
    return process.env.CLAUDE_PROJECT_DIR || process.cwd();
  }

  getWolfDir(): string {
    return path.join(this.getProjectDir(), ".wolf");
  }

  /** Parse a Claude Code hook stdin JSON event into a RuntimeEvent.
   *  Claude Code sends structured JSON on stdin for each hook invocation. */
  readEvent(source: string): RuntimeEvent {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(source);
    } catch {
      // Empty/minimal event — hooks always fire even without meaningful data
      return { type: "session-start" };
    }

    // Determine event type from hook context
    const eventType = this.detectEventType(parsed);

    // Extract tool info
    const toolName = (parsed.tool_name || parsed.tool || "") as string;
    const toolInput = (parsed.tool_input || {}) as Record<string, unknown>;

    // Extract file path — Claude uses different keys per tool
    const filePath = (toolInput.file_path ||
      toolInput.path ||
      toolInput.filePath ||
      parsed.file_path ||
      "") as string;

    return {
      type: eventType,
      toolName: toolName || undefined,
      filePath: filePath || undefined,
      content: (parsed.content || parsed.output || "") as string,
      oldString: (toolInput.old_string || toolInput.oldContent || "") as string,
      newString: (toolInput.new_string || toolInput.newContent || "") as string,
      toolOutput: parsed.output
        ? { content: (parsed.output as string) || undefined }
        : undefined,
    };
  }

  /** Format a ContextInjection into Claude Code's expected stderr format.
   *  Claude displays stderr output as warnings/info in the UI. */
  formatOutput(result: ContextInjection): string {
    const icon = result.type === "warning"
      ? "⚠️"
      : result.type === "error"
        ? "❌"
        : "📋";

    const tokenInfo = result.tokens ? ` (~${result.tokens} tok)` : "";

    return `${icon} OpenWolf: ${result.message}${tokenInfo}\n`;
  }

  /** Install Claude Code hooks, rules, and CLAUDE.md into a project.
   *  This is the main entry point for adapting a project to OpenWolf. */
  async install(projectRoot: string): Promise<void> {
    const wolfDir = path.join(projectRoot, ".wolf");
    const claudeDir = path.join(projectRoot, ".claude");

    // ── Claude settings: hook configuration ──
    ensureDir(claudeDir);
    const settingsPath = path.join(claudeDir, "settings.json");
    const existingSettings = readJSON<Record<string, unknown>>(settingsPath, {});
    const mergedSettings = this.mergeHookSettings(existingSettings);
    writeText(settingsPath, JSON.stringify(mergedSettings, null, 2) + "\n");

    // ── Claude rules ──
    const rulesDir = path.join(claudeDir, "rules");
    ensureDir(rulesDir);
    writeText(path.join(rulesDir, "openwolf.md"), RULES_CONTENT);

    // ── CLAUDE.md snippet ──
    const claudeMdPath = path.join(projectRoot, "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
      const existing = readText(claudeMdPath);
      if (!existing.includes("OpenWolf")) {
        writeText(claudeMdPath, CLAUDE_MD_SNIPPET + "\n\n" + existing);
      }
    } else {
      writeText(claudeMdPath, CLAUDE_MD_SNIPPET);
    }

    // ── Copy hook scripts to .wolf/hooks/ ──
    await this.installHookScripts(wolfDir, projectRoot);
  }

  // ─── Private Helpers ─────────────────────────────────────

  private detectEventType(parsed: Record<string, unknown>): RuntimeEvent["type"] {
    // If the hook context has specific fields, use those to determine event type
    const input = (parsed.tool_input || {}) as Record<string, unknown>;
    const toolName = ((parsed.tool_name || parsed.tool || "") as string).toLowerCase();

    if (parsed.event_type === "SessionStart") return "session-start";
    if (parsed.event_type === "Stop") return "stop";
    if (parsed.event_type === "PreToolUse") {
      if (toolName === "read") return "pre-read";
      if (["write", "edit", "multiedit", "edit_and_cont"].includes(toolName)) return "pre-write";
    }
    if (parsed.event_type === "PostToolUse") {
      if (toolName === "read") return "post-read";
      if (["write", "edit", "multiedit", "edit_and_cont"].includes(toolName)) return "post-write";
    }

    // Fallback: detect from event data shape
    if (input.old_string !== undefined || input.new_string !== undefined) return "pre-write";
    if (input.file_path || input.path) return "pre-read";

    return "session-start";
  }

  private mergeHookSettings(
    existing: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged = { ...existing };
    if (!merged.hooks) merged.hooks = {};

    const hooks = merged.hooks as Record<
      string,
      Array<{ matcher: string; hooks: Array<{ command?: string; type: string }> }>
    >;

    for (const [event, newMatchers] of Object.entries(
      HOOK_SETTINGS.hooks as Record<string, unknown>,
    )) {
      if (!hooks[event]) hooks[event] = [];

      // Remove old OpenWolf hook entries
      hooks[event] = hooks[event].filter((entry) => {
        const isOpenWolfHook = entry.hooks?.some(
          (h) => h.command && h.command.includes(".wolf/hooks/"),
        );
        return !isOpenWolfHook;
      });

      // Add new entries
      for (const matcher of newMatchers as Array<unknown>) {
        hooks[event].push(matcher as typeof hooks[string][number]);
      }
    }

    return merged;
  }

  private async installHookScripts(
    wolfDir: string,
    projectRoot: string,
  ): Promise<void> {
    const hooksDir = path.join(wolfDir, "hooks");
    ensureDir(hooksDir);

    const hookFiles = [
      "session-start.js",
      "pre-read.js",
      "pre-write.js",
      "post-read.js",
      "post-write.js",
      "stop.js",
      "shared.js",
    ];

    // Determine source directory for compiled hook scripts
    const sourceDir = this.resolveHookSourceDir();
    let copied = false;

    if (sourceDir) {
      for (const file of hookFiles) {
        const src = path.join(sourceDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(hooksDir, file));
          copied = true;
        }
      }
    }

    if (!copied) {
      console.warn("  ⚠ Could not find compiled hook scripts. Run 'pnpm build:hooks'.");
    }

    // Always write ESM package.json so hooks work in any project
    writeText(
      path.join(hooksDir, "package.json"),
      JSON.stringify({ type: "module" }, null, 2) + "\n",
    );
  }

  private resolveHookSourceDir(): string {
    // Check common locations for compiled hooks
    const candidates = [
      path.resolve(__dirname, "..", "..", "dist", "src", "hooks"),
      path.resolve(__dirname, "..", "..", "dist", "hooks"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "shared.js"))) {
        return candidate;
      }
    }

    return "";
  }
}
