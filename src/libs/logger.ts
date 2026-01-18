/*
  Minimal structured logging helper.
  - Honors incoming request id header if present, otherwise generates one.
  - Accepts context objects to keep logs greppable.
*/

import crypto from "crypto";

export type LogLevel = "info" | "warn" | "error";

export function getRequestId(headers?: Headers | null): string {
  const fromHeader =
    headers?.get("x-request-id") ||
    headers?.get("x-correlation-id") ||
    headers?.get("x-amzn-trace-id");
  if (fromHeader) return fromHeader;
  return crypto.randomUUID();
}

export function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    ...context,
  };

  // Keep it simple: JSON string for easy ingestion
  console[level](JSON.stringify(payload));
}

export const logInfo = (message: string, context?: Record<string, unknown>) =>
  log("info", message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) =>
  log("warn", message, context);
export const logError = (message: string, context?: Record<string, unknown>) =>
  log("error", message, context);
