## Purpose
Multi-resolution context retrieval engine — given a file path or query, returns compressed context at the requested resolution level (repo → module → file → block). Includes relevance ranking and caching.

## Inputs
- File path or module name (ContextRequest)
- Resolution level ('repo' | 'module' | 'file' | 'block')
- Max token budget (optional)

## Outputs
- ContextResult with compressed content, token count, cache status, confidence score

## Dependencies
- `core/anatomy/` — for file descriptions and module structure
- `core/compression/` — for multi-resolution summaries
- `core/skepticism/` — for confidence scoring
- `storage/cache/` — for semantic cache

## Lifecycle
1. Resolve file/module from anatomy
2. Look up or generate compressed summary at requested resolution
3. Score relevance using context ranker
4. Return result with cache status and confidence
