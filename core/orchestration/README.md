## Purpose
Orchestration engine — coordinates all context intelligence systems into a unified pipeline. Manages full session lifecycle, routes context requests through retrieval → compression → skepticism → memory, and coordinates provider selection for AI tasks. The central nervous system of OpenWolf.

## Inputs
- Session events (from runtime adapter)
- Context requests (from hook scripts or API calls)
- Provider configuration (from `.wolf/config.json`)

## Outputs
- Unified context injections (coordinated across systems)
- Session lifecycle management
- Provider-routed AI task execution

## Dependencies
- `core/retrieval/` — multi-resolution context retrieval
- `core/compression/` — context compression
- `core/skepticism/` — confidence scoring and freshness checks
- `core/memory/` — memory persistence
- `core/token_budget/` — token tracking
- `providers/` — AI provider routing

## Lifecycle
1. **Session start**: Initialize all subsystems for a new session
2. **Pre-tool**: Coordinate context injection before tool calls (retrieval + compression + skepticism)
3. **Post-tool**: Coordinate post-tool processing (memory append, token tracking, anatomy update)
4. **Session stop**: Finalize all subsystems, save state
5. **Periodic**: Route cron tasks to appropriate provider
