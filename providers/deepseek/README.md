## Purpose
DeepSeek AI provider — sends AI tasks to DeepSeek models via OpenAI-compatible API.

## Status
✅ Implemented. Requires `openai` npm package and `DEEPSEEK_API_KEY` env var.

## Models
- deepseek-chat (default)
- deepseek-reasoner

## Usage
```ts
const provider = new DeepSeekProvider({ model: "deepseek-chat" });
const response = await provider.run({
  prompt: "Analyze this code...",
  maxTokens: 4096,
});
```
