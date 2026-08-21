import { getCloudflareD1Binding } from "../db/cloudflare-runtime";

export type TeamDataAction="load"|"save";
export type TeamDataResult={payload:unknown|null;updatedAt:string|null}|{ok:true};

export async function runTeamDataAction(action:TeamDataAction,payload?:unknown):Promise<TeamDataResult> {
  const db=await getCloudflareD1Binding();
  await db.prepare("CREATE TABLE IF NOT EXISTS team_workspace (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  if(action==="save"){
    await db.prepare("INSERT INTO team_workspace (workspace_key,payload,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP")
      .bind(JSON.stringify(payload??{})).run();
    return {ok:true};
  }
  const row=await db.prepare("SELECT payload,updated_at FROM team_workspace WHERE workspace_key='main'").first<{payload:string;updated_at:string}>();
  return {payload:row?JSON.parse(row.payload):null,updatedAt:row?.updated_at??null};
}
