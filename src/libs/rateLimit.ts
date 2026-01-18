/*
  Fixed-window rate limiter with optional Postgres backend.
  - In production with DB env set: persists counters in Postgres (survives restarts, works across instances).
  - Otherwise falls back to in-memory (single-node/dev).
*/

import { sql } from "@vercel/postgres";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

const hasDb =
  !!process.env.DATABASE_URL ||
  !!process.env.POSTGRES_URL ||
  !!process.env.VERCEL_POSTGRES_URL;

let dbInitialized = false;

async function ensureDb() {
  if (!hasDb || dbInitialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_expires_at TIMESTAMPTZ NOT NULL
    );
  `;
  dbInitialized = true;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

async function checkDbLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await ensureDb();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const existing =
    await sql`SELECT count, window_expires_at FROM rate_limits WHERE key = ${key} LIMIT 1`;
  const row = existing.rows[0];

  // New bucket or expired window
  if (!row || (row.window_expires_at && row.window_expires_at.getTime() <= now.getTime())) {
    await sql`
      INSERT INTO rate_limits (key, count, window_expires_at)
      VALUES (${key}, ${1}, ${resetAt.toISOString()})
      ON CONFLICT (key)
      DO UPDATE SET count = ${1}, window_expires_at = ${resetAt.toISOString()};
    `;
    return { ok: true, remaining: limit - 1, resetAt: resetAt.getTime() };
  }

  const currentCount = Number(row.count) || 0;
  const windowResetAt = row.window_expires_at.getTime();

  if (currentCount >= limit) {
    return { ok: false, remaining: 0, resetAt: windowResetAt };
  }

  const nextCount = currentCount + 1;
  await sql`
    UPDATE rate_limits
    SET count = ${nextCount}
    WHERE key = ${key};
  `;

  return { ok: true, remaining: limit - nextCount, resetAt: windowResetAt };
}

function checkMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  const nextCount = existing.count + 1;
  memoryBuckets.set(key, { ...existing, count: nextCount });
  return { ok: true, remaining: limit - nextCount, resetAt: existing.resetAt };
}

export async function checkRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;
  if (hasDb) {
    try {
      return await checkDbLimit(key, limit, windowMs);
    } catch (error) {
      console.error("RateLimit DB error, falling back to memory", error);
      // Fallback to memory if DB fails
      return checkMemoryLimit(key, limit, windowMs);
    }
  }

  return checkMemoryLimit(key, limit, windowMs);
}
