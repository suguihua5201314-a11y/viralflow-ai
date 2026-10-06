import {
  FINAL_SCRIPT_CLIENT_DIAGNOSTIC_MAX_BYTES,
  parseFinalScriptClientDiagnostic,
} from "../../client-diagnostics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > FINAL_SCRIPT_CLIENT_DIAGNOSTIC_MAX_BYTES) return Response.json({ accepted: false }, { status: 413 });

  let raw = "";
  try { raw = await request.text(); }
  catch { return Response.json({ accepted: false }, { status: 400 }); }
  if (new TextEncoder().encode(raw).byteLength > FINAL_SCRIPT_CLIENT_DIAGNOSTIC_MAX_BYTES) return Response.json({ accepted: false }, { status: 413 });

  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return Response.json({ accepted: false }, { status: 400 }); }
  const diagnostic = parseFinalScriptClientDiagnostic(parsed);
  if (!diagnostic) return Response.json({ accepted: false }, { status: 400 });

  console.info(JSON.stringify({ scope: "final_script_client", transport: "server", ...diagnostic }));
  return Response.json({ accepted: true }, { status: 202 });
}
