import { persistQualityTracePatch, qualityTraceEnabled, qualityTraceReadAuthorized, readQualityTrace, validQualityTraceId } from "../../../quality-trace";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ qualityTraceId: string }> }) {
  if (!qualityTraceEnabled()) return new Response(null, { status: 404 });
  if (!qualityTraceReadAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { qualityTraceId } = await context.params;
  if (!validQualityTraceId(qualityTraceId)) return Response.json({ error: "invalid_quality_trace_id" }, { status: 400 });
  const trace = await readQualityTrace(qualityTraceId);
  return trace ? Response.json(trace) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ qualityTraceId: string }> }) {
  if (!qualityTraceEnabled()) return new Response(null, { status: 404 });
  const { qualityTraceId } = await context.params;
  if (!validQualityTraceId(qualityTraceId)) return Response.json({ error: "invalid_quality_trace_id" }, { status: 400 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 262144) return Response.json({ error: "payload_too_large" }, { status: 413 });
  try {
    const body = await request.json() as { finalScript?: unknown; scriptRevisionId?: unknown };
    if (!body.finalScript || typeof body.scriptRevisionId !== "string") return Response.json({ error: "invalid_payload" }, { status: 400 });
    const persisted = await persistQualityTracePatch({ qualityTraceId, identity: { scriptRevisionId: body.scriptRevisionId }, finalScript: body.finalScript });
    return Response.json({ qualityTraceId, persisted }, { status: 202 });
  } catch { return Response.json({ error: "invalid_payload" }, { status: 400 }); }
}
