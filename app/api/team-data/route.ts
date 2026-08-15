export const runtime = "edge";

const responseHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json; charset=utf-8",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: responseHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: string; action?: "load" | "save"; payload?: unknown };
    if (body.password !== "587666") {
      return Response.json({ error: "团队密码不正确" }, { status: 401, headers: responseHeaders });
    }
    // @ts-expect-error Cloudflare injects this module in the hosted runtime.
    const { env } = await import("cloudflare:workers");
    if (!env.DB) return Response.json({ error: "云端数据库未连接" }, { status: 503, headers: responseHeaders });
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS team_workspace (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
    if (body.action === "save") {
      await env.DB.prepare("INSERT INTO team_workspace (workspace_key,payload,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP")
        .bind(JSON.stringify(body.payload ?? {})).run();
      return Response.json({ ok: true }, { headers: responseHeaders });
    }
    const row = await env.DB.prepare("SELECT payload,updated_at FROM team_workspace WHERE workspace_key='main'").first() as { payload: string; updated_at: string } | null;
    return Response.json({ payload: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at ?? null }, { headers: responseHeaders });
  } catch {
    return Response.json({ error: "团队数据服务暂时不可用" }, { status: 500, headers: responseHeaders });
  }
}
