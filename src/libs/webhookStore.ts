import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { sql } from "@vercel/postgres";
import { withLock } from "./mutex";

interface WebhookRecord {
  eventId: string;
  processed: boolean;
  createdAt: string;
  processedAt?: string | null;
}

const FILE = join(process.cwd(), "logs", "webhook-events.json");
const LOGS_DIR = dirname(FILE);
const hasDb =
  !!process.env.DATABASE_URL ||
  !!process.env.POSTGRES_URL ||
  !!process.env.VERCEL_POSTGRES_URL;

let dbInitialized = false;

function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

async function ensureDb() {
  if (!hasDb || dbInitialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      processed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );
  `;
  dbInitialized = true;
}

function readFileStore(): Record<string, WebhookRecord> {
  try {
    const content = readFileSync(FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeFileStore(data: Record<string, WebhookRecord>) {
  ensureLogsDir();
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmp, FILE);
}

/**
 * Reserve a webhook event for processing.
 * @returns true if this event is new and should be processed, false if already handled.
 */
export async function reserveWebhookEvent(eventId: string): Promise<boolean> {
  if (!eventId) return false;

  if (hasDb) {
    await ensureDb();
    const inserted =
      await sql`INSERT INTO webhook_events (event_id) VALUES (${eventId})
                ON CONFLICT DO NOTHING
                RETURNING event_id`;
    return (inserted.rowCount ?? 0) > 0;
  }

  return withLock("webhook-file", async () => {
    const data = readFileStore();
    if (data[eventId]?.processed !== undefined) {
      return false;
    }
    data[eventId] = {
      eventId,
      processed: false,
      createdAt: new Date().toISOString(),
    };
    writeFileStore(data);
    return true;
  });
}

/**
 * Mark a reserved webhook as processed.
 * Should be called only after successful handling.
 */
export async function markWebhookProcessed(eventId: string): Promise<void> {
  if (!eventId) return;

  if (hasDb) {
    await ensureDb();
    await sql`
      UPDATE webhook_events
      SET processed = TRUE, processed_at = NOW()
      WHERE event_id = ${eventId};
    `;
    return;
  }

  await withLock("webhook-file", async () => {
    const data = readFileStore();
    if (!data[eventId]) {
      data[eventId] = {
        eventId,
        processed: true,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };
    } else {
      data[eventId].processed = true;
      data[eventId].processedAt = new Date().toISOString();
    }
    writeFileStore(data);
  });
}

/**
 * Release a reservation (e.g. when processing fails) so a retry can occur.
 */
export async function releaseWebhookReservation(eventId: string): Promise<void> {
  if (!eventId) return;

  if (hasDb) {
    await ensureDb();
    await sql`DELETE FROM webhook_events WHERE event_id = ${eventId};`;
    return;
  }

  await withLock("webhook-file", async () => {
    const data = readFileStore();
    if (data[eventId]) {
      delete data[eventId];
      writeFileStore(data);
    }
  });
}
