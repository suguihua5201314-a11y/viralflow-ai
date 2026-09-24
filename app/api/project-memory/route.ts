import { NextResponse } from "next/server";
import { getCloudflareD1Binding } from "../../../db/cloudflare-runtime";
import { validateProjectMemoryWrite, type ProjectMemory } from "../../project-memory";

const WORKSPACE_KEY = "project-memory-v1";

async function ensureStorage() {
  const db = await getCloudflareD1Binding();
  await db.prepare("CREATE TABLE IF NOT EXISTS team_workspace (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  return db;
}

export async function GET() {
  try {
    const db = await ensureStorage();
    const row = await db.prepare("SELECT payload,updated_at FROM team_workspace WHERE workspace_key=?").bind(WORKSPACE_KEY).first<{ payload: string; updated_at: string }>();
    return NextResponse.json({ memory: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at ?? null });
  } catch (error) {
    return NextResponse.json({ memory: null, updatedAt: null, storage: "browser-fallback", reason: error instanceof Error ? "D1 unavailable" : "storage unavailable" });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { memory?: ProjectMemory; expectedRemoteRevision?: number | null };
    const memory = body.memory;
    if (!memory) return NextResponse.json({ error: "项目记忆格式无效", category: "invalid" }, { status: 400 });
    const db = await ensureStorage();
    const row = await db.prepare("SELECT payload FROM team_workspace WHERE workspace_key=?").bind(WORKSPACE_KEY).first<{ payload: string }>();
    const current = row ? JSON.parse(row.payload) as ProjectMemory : null;
    const decision = validateProjectMemoryWrite(current, memory, body.expectedRemoteRevision ?? null);
    if (!decision.ok) return NextResponse.json({ error: decision.reason, category: decision.status }, { status: decision.status === "invalid" ? 400 : 409 });
    if (decision.status === "idempotent") return NextResponse.json({ ok: true, status: "idempotent", memoryRevision: memory.memoryRevision });
    await db.prepare("INSERT INTO team_workspace (workspace_key,payload,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP")
      .bind(WORKSPACE_KEY, JSON.stringify(memory)).run();
    return NextResponse.json({ ok: true, status: "accepted", memoryRevision: memory.memoryRevision });
  } catch (error) {
    return NextResponse.json({ ok: false, persisted: false, category: "server_error", storage: "browser-fallback", reason: error instanceof Error ? "D1 unavailable" : "storage unavailable" }, { status: 503 });
  }
}
