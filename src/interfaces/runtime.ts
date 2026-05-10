export interface IRuntimeAdapter {
  readonly name: string;
  getProjectDir(): string;
  getWolfDir(): string;
  readEvent(source: string): RuntimeEvent;
  formatOutput(result: ContextInjection): string;
  install(projectRoot: string): Promise<void>;
}

export interface RuntimeEvent {
  type: 'session-start' | 'pre-read' | 'post-read' | 'pre-write' | 'post-write' | 'stop';
  toolName?: string;
  filePath?: string;
  content?: string;
  oldString?: string;
  newString?: string;
  toolOutput?: { content?: string };
}

export interface SessionEvent {
  sessionId: string;
  startTime: string;
  runtime: string;
  projectRoot: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  content?: string;
  error?: string;
}

export interface ContextInjection {
  type: 'context' | 'warning' | 'error';
  message: string;
  tokens?: number;
}
