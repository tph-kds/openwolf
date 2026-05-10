## Purpose
Anthropic Claude provider — sends AI tasks to Anthropic's Claude models via CLI or SDK.

## Status
✅ Implemented. Supports two modes:
1. **CLI mode**: Uses `claude -p` stdin piping (default, no API key needed with OAuth)
2. **SDK mode**: Uses `@anthropic-ai/sdk` package with ANTHROPIC_API_KEY

## Models
- claude-sonnet-4-20250514 (default)
- claude-3-7-sonnet-latest
- claude-3-5-sonnet-latest
- claude-3-5-haiku-latest
- claude-3-opus-latest

## Usage
```ts
const provider = new AnthropicProvider({ preferCli: true });
const response = await provider.run({
  prompt: "Analyze this code...",
  context: ["file1 content..."],
  maxTokens: 4096,
  temperature: 0.7,
});
```
