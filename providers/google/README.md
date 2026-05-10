## Purpose
Google Gemini provider — sends AI tasks to Google's Gemini models via the Google AI SDK.

## Status
✅ Implemented. Requires `@google/generative-ai` npm package and `GOOGLE_API_KEY` env var.

## Models
- gemini-2.5-pro-exp-03-25
- gemini-2.5-flash-preview-04-17
- gemini-2.0-flash (default)
- gemini-1.5-pro
- gemini-1.5-flash

## Usage
```ts
const provider = new GoogleProvider({ model: "gemini-2.5-pro-exp-03-25" });
const response = await provider.run({
  prompt: "Analyze this code...",
  maxTokens: 4096,
});
```
