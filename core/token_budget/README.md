## Purpose
Token optimization engine — estimates token costs for files and operations, tracks session and lifetime token consumption in a persistent ledger, detects wasteful token patterns, and deduplicates file reads within sessions. The foundation for read-deduplication.

## Inputs
- File contents (for token estimation)
- Session hook events (pre-read, post-read)
- `.wolf/token-ledger.json` (for persistent tracking)

## Outputs
- Token estimates per file (by content type)
- Session token count and lifetime totals
- Waste pattern detection reports
- Read-deduplication warnings and session read history

## Dependencies
- `storage/` — for ledger persistence (currently file-system)
- No runtime or provider dependencies

## Lifecycle
1. **Pre-read**: Check read history, emit warning if file already read this session
2. **Post-read**: Estimate tokens consumed, update session counts
3. **Session**: Accumulate session token count
4. **Stop**: Write final session counts to persistent ledger
5. **Periodic**: Analyze ledger for waste patterns (large unused reads, repeated full-project scans)
