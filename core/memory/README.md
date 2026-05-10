## Purpose
Memory persistence engine — stores and retrieves chronological action log (`memory.md`), learned preferences and conventions (`cerebrum.md`), and per-session tracking data (`_session.json`). Preserves debugging intelligence, architectural decisions, and failed paths across sessions.

## Inputs
- Hook events (post-write for memory append, pre-write for cerebrum check)
- Session events (session-start, stop)
- Bug reports (auto-detected from write failures)

## Outputs
- `memory.md` — chronological action log with entries
- `cerebrum.md` — learned preferences, conventions, do-not-repeat patterns
- `_session.json` — per-session state (read history, counts, flags)

## Dependencies
- `src/interfaces/memory.ts` — MemoryEntry, MemoryQuery types
- No runtime or provider dependencies

## Lifecycle
1. **Session start**: Load session state from `_session.json`
2. **During session**: Append actions to memory.md, check cerebrum for relevant learnings
3. **Session stop**: Save final session state, check cerebrum freshness
4. **Persistent**: All data survives across sessions and daemon restarts
