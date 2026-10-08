import { getCloudflareD1Binding } from "../db/cloudflare-runtime";

export const QUALITY_TRACE_SCHEMA_VERSION = 1;
export const QUALITY_TRACE_NOT_EXECUTED = "NOT_EXECUTED" as const;

export type QualityTracePatch = Record<string, unknown> & { qualityTraceId: string };
export type QualityTraceRecord = QualityTracePatch & {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
};

const TRACE_ID = /^quality-trace:[0-9a-f-]{36}$/i;

export function createQualityTraceId() {
  return `quality-trace:${globalThis.crypto.randomUUID()}`;
}

export function validQualityTraceId(value: unknown): value is string {
  return typeof value === "string" && TRACE_ID.test(value);
}

export function qualityTraceEnabled(environment = process.env.VERCEL_ENV, nodeEnvironment = process.env.NODE_ENV) {
  if (environment === "production" || nodeEnvironment === "production" && environment !== "preview") return false;
  return environment === "preview" || nodeEnvironment !== "production";
}

export function emptyQualityTrace(qualityTraceId: string, now = new Date().toISOString()): QualityTraceRecord {
  return {
    schemaVersion: QUALITY_TRACE_SCHEMA_VERSION,
    qualityTraceId,
    createdAt: now,
    updatedAt: now,
    creativeDirection: QUALITY_TRACE_NOT_EXECUTED,
    creativeBrief: QUALITY_TRACE_NOT_EXECUTED,
    productContext: QUALITY_TRACE_NOT_EXECUTED,
    writer: { attempt0: QUALITY_TRACE_NOT_EXECUTED, attempt1: QUALITY_TRACE_NOT_EXECUTED, acceptedDraft: QUALITY_TRACE_NOT_EXECUTED },
    critic: QUALITY_TRACE_NOT_EXECUTED,
    rewrite: QUALITY_TRACE_NOT_EXECUTED,
    finalScript: QUALITY_TRACE_NOT_EXECUTED,
  };
}

export function mergeQualityTrace(base: QualityTraceRecord, patch: QualityTracePatch, now = new Date().toISOString()): QualityTraceRecord {
  const merged = { ...base, ...patch, schemaVersion: QUALITY_TRACE_SCHEMA_VERSION, qualityTraceId: base.qualityTraceId, createdAt: base.createdAt, updatedAt: now } as QualityTraceRecord;
  if (base.identity || patch.identity) merged.identity = { ...(base.identity as object || {}), ...(patch.identity as object || {}) };
  return merged;
}

type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; run(): Promise<unknown> };
type D1Database = { prepare(query: string): D1Statement };

async function d1(): Promise<D1Database | null> {
  try { return await getCloudflareD1Binding() as D1Database; } catch { return null; }
}

async function neon() {
  const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection) return null;
  const module = await import("@neondatabase/serverless");
  return module.neon(connection);
}

async function readStored(qualityTraceId: string): Promise<QualityTraceRecord | null> {
  const sql = await neon();
  if (sql) {
    await sql`CREATE TABLE IF NOT EXISTS quality_trace (quality_trace_id TEXT PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`SELECT payload FROM quality_trace WHERE quality_trace_id = ${qualityTraceId} LIMIT 1` as Array<{ payload: QualityTraceRecord }>;
    return rows[0]?.payload || null;
  }
  const db = await d1();
  if (!db) return null;
  await db.prepare("CREATE TABLE IF NOT EXISTS quality_trace (quality_trace_id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  const row = await db.prepare("SELECT payload FROM quality_trace WHERE quality_trace_id = ? LIMIT 1").bind(qualityTraceId).first<{ payload: string }>();
  return row ? JSON.parse(row.payload) as QualityTraceRecord : null;
}

async function writeStored(record: QualityTraceRecord) {
  const sql = await neon();
  if (sql) {
    await sql`CREATE TABLE IF NOT EXISTS quality_trace (quality_trace_id TEXT PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`INSERT INTO quality_trace (quality_trace_id, payload, created_at, updated_at) VALUES (${record.qualityTraceId}, ${JSON.stringify(record)}::jsonb, ${record.createdAt}, ${record.updatedAt}) ON CONFLICT (quality_trace_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`;
    return;
  }
  const db = await d1();
  if (!db) throw new Error("quality_trace_storage_unavailable");
  await db.prepare("CREATE TABLE IF NOT EXISTS quality_trace (quality_trace_id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await db.prepare("INSERT INTO quality_trace (quality_trace_id, payload, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(quality_trace_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").bind(record.qualityTraceId, JSON.stringify(record), record.createdAt, record.updatedAt).run();
}

export async function persistQualityTracePatchWith(
  patch: QualityTracePatch,
  storage: { read(id: string): Promise<QualityTraceRecord | null>; write(record: QualityTraceRecord): Promise<void> },
): Promise<boolean> {
  if (!validQualityTraceId(patch.qualityTraceId)) return false;
  try {
    const current = await storage.read(patch.qualityTraceId) || emptyQualityTrace(patch.qualityTraceId);
    await storage.write(mergeQualityTrace(current, patch));
    return true;
  } catch (error) {
    console.warn(JSON.stringify({ event: "quality_trace_write_failed", qualityTraceId: patch.qualityTraceId, error: error instanceof Error ? error.message : "unknown" }));
    return false;
  }
}

export async function persistQualityTracePatch(patch: QualityTracePatch): Promise<boolean> {
  if (!qualityTraceEnabled()) return false;
  return persistQualityTracePatchWith(patch, { read: readStored, write: writeStored });
}

export async function readQualityTrace(qualityTraceId: string): Promise<QualityTraceRecord | null> {
  if (!qualityTraceEnabled() || !validQualityTraceId(qualityTraceId)) return null;
  try { return await readStored(qualityTraceId); } catch { return null; }
}

export function qualityTraceReadAuthorized(request: Request) {
  const expected = process.env.QUALITY_TRACE_READ_TOKEN || process.env.TEAM_PASSWORD;
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return request.headers.get("x-quality-trace-key") === expected || bearer === expected;
}
