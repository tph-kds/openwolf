import * as fs from "node:fs";
import * as path from "node:path";

export interface SessionData {
  session_id: string;
  started: string;
  files_read: Record<string, { count: number; tokens: number; first_read: string }>;
  files_written: Array<{ file: string; action: string; tokens: number; at: string }>;
  edit_counts: Record<string, number>;
  anatomy_hits: number;
  anatomy_misses: number;
  repeated_reads_warned: number;
  cerebrum_warnings: number;
  stop_count: number;
}

export function getSessionFilePath(wolfDir: string): string {
  return path.join(wolfDir, "hooks", "_session.json");
}

export function createSession(wolfDir: string, sessionId: string, started: string): SessionData {
  const hooksDir = path.join(wolfDir, "hooks");
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  const session: SessionData = {
    session_id: sessionId,
    started,
    files_read: {},
    files_written: [],
    edit_counts: {},
    anatomy_hits: 0,
    anatomy_misses: 0,
    repeated_reads_warned: 0,
    cerebrum_warnings: 0,
    stop_count: 0,
  };

  fs.writeFileSync(getSessionFilePath(wolfDir), JSON.stringify(session, null, 2), "utf-8");
  return session;
}

export function loadSession(wolfDir: string): SessionData {
  try {
    const data = fs.readFileSync(getSessionFilePath(wolfDir), "utf-8");
    return JSON.parse(data) as SessionData;
  } catch {
    return {
      session_id: "",
      started: "",
      files_read: {},
      files_written: [],
      edit_counts: {},
      anatomy_hits: 0,
      anatomy_misses: 0,
      repeated_reads_warned: 0,
      cerebrum_warnings: 0,
      stop_count: 0,
    };
  }
}

export function saveSession(wolfDir: string, session: SessionData): void {
  fs.writeFileSync(getSessionFilePath(wolfDir), JSON.stringify(session, null, 2), "utf-8");
}
