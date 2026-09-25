export const runtime = "nodejs";
export const maxDuration = 30;

const PROBE_TIMEOUT_MS = 10_000;
const PROVIDER_ENDPOINTS = {
  ark: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
} as const;

type ProviderName = keyof typeof PROVIDER_ENDPOINTS;

export type ConnectivityProbeResult = {
  provider: ProviderName;
  startedAt: string;
  headersReceived: boolean;
  elapsedToHeadersMs: number | null;
  httpStatus: number | null;
  contentType: string | null;
  timeoutStage: "waiting_for_headers" | null;
  totalElapsedMs: number;
};

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || /timeout|aborted/i.test(error.message));
}

export async function probeProvider(
  provider: ProviderName,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<ConnectivityProbeResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  try {
    const response = await fetchImpl(PROVIDER_ENDPOINTS[provider], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const headersReceived = Date.now();
    return {
      provider,
      startedAt,
      headersReceived: true,
      elapsedToHeadersMs: headersReceived - started,
      httpStatus: response.status,
      contentType: response.headers.get("content-type")?.slice(0, 120) || null,
      timeoutStage: null,
      totalElapsedMs: Date.now() - started,
    };
  } catch (error) {
    return {
      provider,
      startedAt,
      headersReceived: false,
      elapsedToHeadersMs: null,
      httpStatus: null,
      contentType: null,
      timeoutStage: isTimeout(error) ? "waiting_for_headers" : null,
      totalElapsedMs: Date.now() - started,
    };
  }
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") return Response.json({ error: "Not found" }, { status: 404 });
  let body: unknown = null;
  try { body = await request.json(); } catch {}
  if (body && typeof body === "object" && "url" in body) {
    return Response.json({ error: "Arbitrary URLs are not supported" }, { status: 400 });
  }
  const [ark, deepseek] = await Promise.all([
    probeProvider("ark"),
    probeProvider("deepseek"),
  ]);
  return Response.json({ probes: [ark, deepseek] });
}
