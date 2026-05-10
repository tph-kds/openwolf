## Purpose
Generic runtime adapter for any AI coding agent that can read configuration files — Cursor, Windsurf, GitHub Copilot, Amazon Q, Tabnine, Sourcegraph Cody, Continue.dev, and more.

## How It Works
This adapter provides universal agent integration through file-based configuration:

1. Writes `.wolf/agent-prompt.md` — full system prompt for any agent
2. Writes `.wolf/agent-rules.md` — concise behavioral rules
3. Detects and injects into existing agent configs (`.cursorrules`, `.windsurfrules`, copilot-instructions, etc.)
4. Falls back to `OPENWOLF.md` in the project root

## Key Files
- `generic-adapter.ts` — Full `IRuntimeAdapter` implementation
- `index.ts` — Re-exports `GenericAdapter`

## Supported Agents
- Cursor (.cursorrules)
- Windsurf (.windsurfrules)
- GitHub Copilot (.github/copilot-instructions.md)
- Continue.dev (CONTINUE.md, .continue/config.json)
- Amazon Q Developer
- Tabnine
- Sourcegraph Cody
- Any agent reading project-level instructions

## Status
✅ Implemented. `GenericAdapter` class with auto-detection of existing config files.
