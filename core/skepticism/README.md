## Purpose
Context skepticism engine — evaluates the freshness, accuracy, and relevance of stored context. Detects when memory entries become stale, identifies architectural drift, and scores confidence in cached context. Prevents agents from acting on outdated information.

## Inputs
- Stored memory entries (cerebrum.md, memory.md)
- Current anatomy (from scan)
- Bug reports (auto-detected and manual)

## Outputs
- Confidence scores for memory entries
- Staleness reports for outdated learnings
- Bug similarity matches for known issues

## Dependencies
- `core/anatomy/` — for comparing stored vs current file structure
- `core/drift/` — for architectural drift detection
- `core/memory/` — for accessing stored entries
- No runtime or provider dependencies

## Lifecycle
1. **Pre-write hook**: Check cerebrum for relevant warnings before file modifications
2. **Stop hook**: Evaluate cerebrum freshness, flag stale entries
3. **Periodic scan**: Compare stored anatomy vs current state, detect drift
4. **Bug detection**: Auto-match errors against known bug database
