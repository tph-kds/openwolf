## Purpose
Knowledge graph engine — builds and persists a semantic understanding of the codebase as a graph: dependency relationships (what imports what), semantic relationships (what relates conceptually), and architectural zones (auth, API, DB, UI, etc.). Enables graph-based context retrieval beyond file-level lookups.

## Inputs
- Anatomy entries with file descriptions
- Import/export analysis (from file contents)
- Module grouping (from anatomy scan)
- Architectural zone definitions (from config or auto-detection)

## Outputs
- Dependency graph (nodes = files, edges = imports)
- Semantic graph (nodes = files, edges = conceptual relationships)
- Architectural zone map (files grouped into zones)
- Graph serialization for persistence

## Dependencies
- `core/anatomy/` — for file structure and descriptions
- `storage/graphs/` — for graph persistence
- No runtime or provider dependencies

## Lifecycle
1. **Build**: Construct dependency graph from anatomy + import analysis
2. **Enrich**: Add semantic edges from file descriptions and conventions
3. **Zone**: Group files into architectural zones
4. **Persist**: Save graph to storage for cross-session use
5. **Query**: Graph traversal for context retrieval (e.g., "show me all auth-related files")
