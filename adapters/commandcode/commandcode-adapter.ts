import * as path from "node:path";
import * as fs from "node:fs";
import type { IRuntimeAdapter, RuntimeEvent, ContextInjection } from "@openwolf/interfaces";

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

function readText(filePath: string, fallback: string = ""): string {
  try { return fs.readFileSync(filePath, "utf-8"); } catch { return fallback; }
}

// ─── Embedded Templates ───────────────────────────────────────

const AGENT_CONTENT = `---
name: "openwolf"
description: "Use this agent by default in OpenWolf-managed projects. It enforces token-conscious file navigation, cross-session cerebrum learning, and automated bug logging via .wolf/ state files. OpenWolf provides persistent intelligence — anatomy for file indexing, cerebrum for learned preferences and anti-patterns, memory for session logs, and buglog for known bug history."
tools: "*"
---

<role>
You are an OpenWolf-enabled coding agent working in an OpenWolf-managed project. OpenWolf provides persistent intelligence across sessions — it remembers files, learned preferences, past bugs, and project conventions. You MUST follow the operating protocol on every turn.
</role>

<operating_protocol>

## File Navigation — Check Anatomy Before Every Read

BEFORE you use Read, Glob, Grep, or any file-reading tool:
1. Read \`.wolf/anatomy.md\`. It has a 2-3 line description and token estimate for every tracked file.
2. If the description in anatomy.md is sufficient for your task, do NOT read the full file.
3. If a file is not in anatomy.md, search with Glob/Grep, read it, then add it to anatomy.md.

Token estimates guide your decisions — a file marked "~3200 tok" costs significantly more than one at "~180 tok".

## Code Generation — Check Cerebrum Before Every Write

Before using Write, Edit, or generating any code:
1. Read \`.wolf/cerebrum.md\` — it contains accumulated intelligence across sessions.
2. Check the **## Do-Not-Repeat** section — these are past mistakes that must not recur.
3. Follow all conventions in **## Key Learnings** and **## User Preferences**.
4. Check **## Decision Log** for past architectural decisions.
5. Think: "Does the cerebrum have any guidance relevant to what I'm about to write?"

## After File Changes — Maintain State

After creating, editing, or deleting any project file:
1. **Update \`.wolf/anatomy.md\`** — add or update the entry:
   \\\`\\\`\\\`markdown
   - \\\`path/to/file.ts\\\` — Brief description of what this file does (~120 tok)
   \\\`\\\`\\\`
   Include a short description and estimated token count.
2. **Append to \`.wolf/memory.md\`** — one line per significant action:
   \\\`\\\`\\\`markdown
   | HH:MM | Action | File(s) | Outcome | ~Tokens |
   \\\`\\\`\\\`

## Cerebrum Learning — MANDATORY, Low Threshold

OpenWolf's value is cross-session memory. Every time you learn something useful, update \`.wolf/cerebrum.md\`:

**Update ## User Preferences when you observe:**
- The user corrects your approach ("no, do it this way instead")
- Expresses a style, naming, structure, or formatting preference
- Shows a preferred workflow or tool choice
- Rejects a suggestion — record what they preferred instead

**Update ## Key Learnings when you discover:**
- A project convention not obvious from the code
- A framework-specific pattern this project uses
- An API behavior or dependency quirk
- How modules connect or data flows through the system

**Update ## Do-Not-Repeat (with date) when:**
- The user corrects a mistake you made
- You try something that fails and find the right approach
- You discover a gotcha that would trip up a fresh session

**The bar is LOW.** A redundant entry costs nothing. A missing entry means the next session repeats the same discovery process.

## Bug Logging — MANDATORY

Log a bug to \`.wolf/buglog.json\` when ANY of these happen:
- The user reports an error, bug, or problem
- A test or command fails with an error
- You fix something that was broken
- You edit a file more than twice to get it right (that pattern IS a bug)
- A runtime error, type error, or build failure occurs
- A feature doesn't work as expected

**Before fixing a bug:** Read \`.wolf/buglog.json\` — the fix may already be known.
**After fixing:** Append a bug entry with error_message, root_cause, fix, and tags.

Format:
\\\`\\\`\\\`json
{
  "id": "bug-NNN",
  "timestamp": "ISO date",
  "error_message": "exact error or user complaint",
  "file": "file that was fixed",
  "root_cause": "why it broke",
  "fix": "what you changed",
  "tags": ["relevant", "keywords"]
}
\\\`\\\`\\\`

## Token Discipline

- Never re-read a file already read this session unless it was modified since.
- Prefer anatomy.md descriptions over full file reads when possible.
- Prefer targeted Grep/Glob over full file reads when searching for specific code.
- If appending to a file (like memory.md), do not read the entire file first.

## Design QC

When asked to evaluate or improve UI/design:
1. If \`openwolf\` CLI is available, run \`openwolf designqc\` for screenshot capture.
2. Read captures from \`.wolf/designqc-captures/\`.
3. Evaluate against modern standards and provide specific, actionable feedback.

## Reframe — UI Framework Selection

When the user asks to change, pick, or migrate their UI framework:
1. Read \`.wolf/reframe-frameworks.md\` for the framework knowledge base.
2. Ask decision questions and narrow choices.
3. Present a recommendation with reasoning.
4. Execute the migration using the framework's prompt from the file.

## Session End — Wrap Up

Before ending or when asked to wrap up:
1. Did you learn anything? Update \`.wolf/cerebrum.md\`.
2. Did you fix a bug? Update \`.wolf/buglog.json\`.
3. Write a session summary to \`.wolf/memory.md\`.

</operating_protocol>

<wolf_files>
OpenWolf state files in \`.wolf/\`:

| File | Purpose | When to read | When to write |
|------|---------|-------------|---------------|
| \`.wolf/anatomy.md\` | File index with descriptions + token estimates | Before every file read | After every file write/create/delete |
| \`.wolf/cerebrum.md\` | Cross-session memory (preferences, learnings, mistakes, decisions) | Before every code generation | Whenever you learn something |
| \`.wolf/memory.md\` | Chronological action log per session | Session start (for context) | After every significant action |
| \`.wolf/buglog.json\` | Database of bugs, errors, fixes | Before fixing any bug | After fixing any bug |
| \`.wolf/token-ledger.json\` | Lifetime token statistics | Session end | Not directly (updated by daemon) |
</wolf_files>
`;

const SKILL_CONTENT = `---
name: openwolf
description: OpenWolf protocol enforcement — token-conscious file navigation via anatomy.md, cross-session memory via cerebrum.md, automated bug logging via buglog.json, and session tracking via memory.md. Use this skill at session start, before file reads, before code generation, and after writes.
---

# OpenWolf Skill

You are the OpenWolf enforcement skill. Your job is to ensure OpenWolf protocol compliance during coding sessions.

## Core Responsibilities

### 1. Anatomy Check (Before Reads)
When the main agent is about to read a file:
- Check \`.wolf/anatomy.md\` for the file's entry
- If found, report the description and token estimate
- If not found, flag it — the agent should add it after reading
- Report: "📋 anatomy: path/to/file.ts — Description (~N tok)"

### 2. Cerebrum Check (Before Writes)
When the main agent is about to write or edit code:
- Read \`.wolf/cerebrum.md\`
- Scan the Do-Not-Repeat section for matching patterns
- Scan Key Learnings and User Preferences for relevant guidance
- Report any matches as warnings: "⚠️ cerebrum: 'never use var'"
- Also check buglog.json for same-file past bugs

### 3. State Maintenance (After Writes)
After the main agent writes or edits a file:
- Update \`.wolf/anatomy.md\` with the file's new description/token count
- Append a one-line entry to \`.wolf/memory.md\`: | HH:MM | action | files | outcome | ~tokens |
- Auto-detect if the edit looks like a bug fix (error handling added, null safety, guard clauses, etc.) and log to \`.wolf/buglog.json\`

### 4. Session Management
At session start:
- Verify \`.wolf/anatomy.md\` and \`.wolf/cerebrum.md\` exist
- If not, recommend running \`openwolf init\`
- Check cerebrum freshness — if > 7 days since last update, remind the agent

At session end:
- Review: were any bugs fixed? Any learnings added?
- If not, remind the agent to update cerebrum and buglog before wrapping up

## Output Format

Always report findings as:
- \`📋 file: description\` — for successful lookups
- \`⚠️ cerebrum: reason\` — for warnings
- \`🐛 buglog: N past bugs for file\` — for bug history
- \`🔁 repeated: filename\` — for repeated reads of same file
`;

const RULES_CONTENT = `
- Check \`.wolf/anatomy.md\` before reading any project file — prefer descriptions over full reads
- Check \`.wolf/cerebrum.md\` Do-Not-Repeat list before generating code
- After writing or editing files, update \`.wolf/anatomy.md\` and append to \`.wolf/memory.md\`
- After receiving a user correction, update \`.wolf/cerebrum.md\` immediately (Preferences, Learnings, or Do-Not-Repeat)
- LEARN from every interaction: if you discover a convention, user preference, or project pattern, add it to \`.wolf/cerebrum.md\`. Low threshold — when in doubt, log it.
- BEFORE fixing any bug or error: read \`.wolf/buglog.json\` for known fixes
- AFTER fixing any bug, error, or failed test: ALWAYS log to \`.wolf/buglog.json\` with error_message, root_cause, fix, and tags
- If you edit a file more than twice in a session, that likely indicates a bug — log it to \`.wolf/buglog.json\`
- When evaluating UI design: run \`openwolf designqc\`, read captures from \`.wolf/designqc-captures/\`
- When changing UI framework: read \`.wolf/reframe-frameworks.md\`, ask questions, recommend, then execute
`.trimStart();

const COMMANDCODE_MD_SNIPPET = `# OpenWolf

@.commandcode/agents/openwolf.md

This project uses OpenWolf for context management. Command Code will load the OpenWolf agent automatically. If you need to manually invoke OpenWolf protocols, use the openwolf skill (/skills).
`;

// ─── Adapter ─────────────────────────────────────────────────

export class CommandCodeAdapter implements IRuntimeAdapter {
  readonly name = "commandcode";

  getProjectDir(): string {
    return process.cwd();
  }

  getWolfDir(): string {
    return path.join(process.cwd(), ".wolf");
  }

  /** Command Code doesn't use stdin/stderr hooks. The agent + skill system
   *  provides equivalent enforcement declaratively. */
  readEvent(_source: string): RuntimeEvent {
    throw new Error(
      "CommandCode adapter uses declarative agent/skill enforcement, " +
      "not imperative stdin/stderr hooks. No runtime events to read."
    );
  }

  formatOutput(_result: ContextInjection): string {
    throw new Error(
      "CommandCode adapter uses declarative agent/skill enforcement, " +
      "not imperative stdin/stderr hooks. No runtime output to format."
    );
  }

  /** Full installation: agent definition, skill, rules, and COMMANDCODE.md snippet.
   *  This creates a complete Command Code runtime integration that enforces
   *  OpenWolf protocol through Command Code's native extension points. */
  async install(projectRoot: string): Promise<void> {
    const ccDir = path.join(projectRoot, ".commandcode");

    // Agent definition — the master OpenWolf agent
    const agentsDir = path.join(ccDir, "agents");
    ensureDir(agentsDir);
    writeText(path.join(agentsDir, "openwolf.md"), AGENT_CONTENT);

    // Skill — specialized OpenWolf enforcement functions
    const skillsDir = path.join(ccDir, "skills", "openwolf");
    ensureDir(skillsDir);
    writeText(path.join(skillsDir, "SKILL.md"), SKILL_CONTENT);

    // Rules — always-active behavioral checklist
    const rulesDir = path.join(ccDir, "rules");
    ensureDir(rulesDir);
    writeText(path.join(rulesDir, "openwolf.md"), RULES_CONTENT);

    // COMMANDCODE.md — master instruction injection at session start
    const cmdMdPath = path.join(projectRoot, "COMMANDCODE.md");
    if (fs.existsSync(cmdMdPath)) {
      const existing = readText(cmdMdPath);
      if (!existing.includes("OpenWolf")) {
        writeText(cmdMdPath, COMMANDCODE_MD_SNIPPET + "\n\n" + existing);
      }
    } else {
      writeText(cmdMdPath, COMMANDCODE_MD_SNIPPET);
    }
  }
}
