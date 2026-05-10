## Purpose
Architectural drift detection engine — tracks changes to the repository structure over time (file additions/removals/renames, dependency graph shifts, module boundary changes) and detects when stored context becomes stale relative to current codebase.

## Inputs
- Current anatomy (from live scan)
- Stored anatomy (from `.wolf/anatomy.md`)
- Dependency structure (from imports analysis)

## Outputs
- Drift reports: files added, removed, renamed, moved
- Dependency change reports: new/removed dependencies, breaking changes
- Staleness scores for cerebrum entries tied to changed files

## Dependencies
- `core/anatomy/` — for current vs stored comparison
- `core/skepticism/` — for confidence scoring and invalidation
- No runtime or provider dependencies

## Lifecycle
1. **Scan comparison**: Diff current anatomy against stored anatomy
2. **Dependency analysis**: Compare import graphs for structural changes
3. **Staleness marking**: Flag cerebrum entries referencing changed files
4. **Report generation**: Produce drift summaries for session injection
