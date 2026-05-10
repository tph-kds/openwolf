## Purpose
Command Code runtime adapter — integrates OpenWolf context intelligence with Command Code sessions via the `.commandcode/` configuration directory. Writes an `openwolf-rules.md` for context injection and registers an OpenWolf agent that reads `.wolf/` files before sessions.

## Inputs
- `.commandcode/` directory structure
- Command Code session lifecycle events
- Project root path

## Outputs
- `.commandcode/agents/openwolf.md` — agent definition that reads `.wolf/`
- `openwolf-rules.md` — context injection configuration
- `RuntimeEvent` objects for core systems

## Dependencies
- `src/interfaces/runtime.ts` — IRuntimeAdapter interface
- `core/` modules — all context intelligence systems
- No Command Code internals — configuration-only integration

## Lifecycle
1. **Init**: Write agent definition and rules to `.commandcode/`
2. **Session**: Map Command Code lifecycle to RuntimeEvent, dispatch to core
3. **Output**: Format core results for Command Code session injection
