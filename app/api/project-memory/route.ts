import { NextResponse } from "next/server";
import { getCloudflareD1Binding } from "../../../db/cloudflare-runtime";

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "项目记忆读取失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const memory = await request.json();
    if (memory?.version !== 1 || !Array.isArray(memory?.projects)) return NextResponse.json({ error: "项目记忆格式无效" }, { status: 400 });
    const db = await ensureStorage();
    await db.prepare("INSERT INTO team_workspace (workspace_key,payload,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP")
      .bind(WORKSPACE_KEY, JSON.stringify(memory)).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "项目记忆保存失败" }, { status: 500 });
  }
}
