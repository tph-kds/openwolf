## Purpose
Repository anatomy engine — scans project structure, generates and maintains `anatomy.md` with file descriptions, token estimates, and module relationships. The foundation for all context retrieval.

## Inputs
- Project file tree (from file-tree utility)
- File contents (for description extraction)
- `.wolfignore` patterns (for exclusion)
- `.wolf/config.json` (for scan settings)

## Outputs
- `anatomy.md` — structured markdown file map
- `AnatomyEntry[]` — parsed entries with path, description, estimated tokens, module group
- Miss rate statistics for read-deduplication

## Dependencies
- `core/token_budget/token-estimator` — for file token cost estimates
- `storage/cache/` — may cache scan results
- No runtime or provider dependencies

## Lifecycle
1. **Scan phase**: Walk project tree, exclude ignored patterns, extract descriptions
2. **Build phase**: Assemble entries into `anatomy.md` with module grouping
3. **Update phase**: Incremental updates when files change (via file-watcher or hook)
4. **Retrieve phase**: Look up anatomy entries by file path for context injection
