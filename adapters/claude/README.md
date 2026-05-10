## Purpose
Claude Code runtime adapter — translates between Claude Code's hook system (stdin JSON events, `CLAUDE_PROJECT_DIR`, `.claude/settings.json`) and OpenWolf's runtime-agnostic `IRuntimeAdapter` interface. Isolates all Claude-specific logic.

## Inputs
- Claude hook stdin JSON events
- `CLAUDE_PROJECT_DIR` environment variable
- Project root path

## Outputs
- `RuntimeEvent` objects for core systems
- `.claude/settings.json` with hook configuration
- `.claude/rules/openwolf.md` with context injection rules
- `CLAUDE.md` snippet

## Dependencies
- `src/interfaces/runtime.ts` — IRuntimeAdapter interface
- `core/` modules — all context intelligence systems
- No other adapter dependencies

## Lifecycle
1. **Init**: Write `.claude/settings.json`, rules, and CLAUDE.md
2. **Session**: Read stdin JSON events, translate to RuntimeEvent, dispatch to core
3. **Output**: Format core results back to Claude's expected stderr format
