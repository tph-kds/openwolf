## Purpose
Local AI provider — sends AI tasks to locally running models via Ollama, LM Studio, or any OpenAI-compatible endpoint.

## Status
✅ Implemented. Supports three backends:

1. **Ollama** (default) — Uses `ollama run` CLI or `http://localhost:11434/v1` API
2. **LM Studio** — Uses `http://localhost:1234/v1` API
3. **Custom** — Any OpenAI-compatible endpoint

## Models
Depends on backend. Ollama defaults: llama3, codellama, mistral, mixtral, deepseek-coder

## Usage
```ts
// Ollama (CLI mode, no extra packages needed)
const provider = new LocalProvider({ backend: "ollama", model: "llama3" });
const response = await provider.run({ prompt: "Explain this code..." });

// LM Studio
const provider = new LocalProvider({ backend: "lm-studio", model: "local-model" });

// Custom endpoint
const provider = new LocalProvider({
  baseURL: "http://localhost:8080/v1",
  model: "my-model",
});
```
