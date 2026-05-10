## Purpose
Context compression engine — converts large repositories and files into compressed, structured semantic summaries at multiple resolution levels (structural → semantic → operational). Reduces token consumption by 65-80% by providing only what's needed.

## Inputs
- File contents (raw text)
- Anatomy entries (structured descriptions)
- Compression configuration (resolution, layers)

## Outputs
- Compressed summaries at repo/module/file/block levels
- Token savings metrics

## Dependencies
- `core/anatomy/` — for file structure and descriptions
- `core/token_budget/` — for token estimation and savings calculation
- No runtime or provider dependencies

## Lifecycle
1. **Structural layer**: Extract file structure, imports/exports, class/function signatures
2. **Semantic layer**: Summarize purpose, key APIs, critical logic paths
3. **Operational layer**: How the module integrates, architectural role, conventions used
4. **Consolidation**: Periodic compression of memory.md into structured learnings
