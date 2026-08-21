import { CloudflareStorageUnavailableError } from "../../../db/cloudflare-runtime";
import { runTeamDataAction } from "../../team-data-adapter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: string; action?: "load" | "save"; payload?: unknown };
    const expectedPassword = process.env.TEAM_PASSWORD;
    if (!expectedPassword || body.password !== expectedPassword) {
      return Response.json({ error: "团队密码不正确" }, { status: 401 });
    }
    return Response.json(await runTeamDataAction(body.action === "save" ? "save" : "load",body.payload));
  } catch(error) {
    if(error instanceof CloudflareStorageUnavailableError)return Response.json({error:error.message},{status:503});
    return Response.json({ error: "团队数据服务暂时不可用" }, { status: 500 });
  }
}
