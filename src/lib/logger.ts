import { randomUUID } from "crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = {
  requestId?: string;
  businessId?: string;
  userId?: string;
  route?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
};

const SENSITIVE = /password|pin|token|secret|authorization|cookie|jwt|phone/i;

function scrub(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 200) return `${value.slice(0, 200)}…`;
    return value;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : scrub(v);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(fields ? (scrub(fields) as LogFields) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

export function newRequestId(): string {
  return randomUUID();
}
