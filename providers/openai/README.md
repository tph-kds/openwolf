## Purpose
OpenAI GPT provider — sends AI tasks to OpenAI models via the OpenAI SDK.

## Status
✅ Implemented. Requires `openai` npm package and `OPENAI_API_KEY` env var.

## Models
- gpt-4o (default)
- gpt-4o-mini
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo

## Usage
```ts
const provider = new OpenAIProvider({ model: "gpt-4o" });
const response = await provider.run({
  prompt: "Analyze token usage...",
  maxTokens: 2048,
  temperature: 0.5,
});
```

## Custom Base URL
Supports OpenAI-compatible APIs via `baseURL` option:
```ts
const provider = new OpenAIProvider({
  baseURL: "https://your-proxy.com/v1",
  apiKey: "your-key",
});
```
