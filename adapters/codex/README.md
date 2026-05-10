## Purpose
OpenAI Codex CLI runtime adapter — integrates OpenWolf's context management into Codex CLI via configuration files and an operating protocol document.

## How It Works
Codex CLI doesn't have a stdin/stderr hook system. Instead, this adapter:

1. Writes `.codex/openwolf.md` — a detailed operating protocol Codex follows
2. Writes `.codex/rules/openwolf.md` — concise behavioral rules
3. Injects OpenWolf reference into `CODEX.md`

## Key Files
- `codex-adapter.ts` — Full `IRuntimeAdapter` implementation
- `index.ts` — Re-exports `CodexAdapter`

## Inputs
- `CODEX_PROJECT_DIR` or `CLAUDE_PROJECT_DIR` env var
- Project root path

## Outputs
- `.codex/openwolf.md` — Operating protocol
- `.codex/rules/openwolf.md` — Behavioral rules
- `CODEX.md` — Session-start instruction injection

## Status
✅ Implemented. `CodexAdapter` class with install/readEvent/formatOutput methods.
