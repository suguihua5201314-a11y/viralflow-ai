export const runtime = "nodejs";
export const maxDuration = 30;

const PROBE_TIMEOUT_MS = 10_000;
const AUTHENTICATED_ARK_TIMEOUT_MS = 15_000;
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

export type AuthenticatedArkProbeResult = {
  provider: "ark";
  modelConfigured: boolean;
  headersReceived: boolean;
  elapsedToHeadersMs: number | null;
  httpStatus: number | null;
  contentType: string | null;
  bodyCompleted: boolean;
  elapsedToBodyMs: number | null;
  totalElapsedMs: number;
  responseSize: number | null;
  timeoutStage: "configuration" | "waiting_for_headers" | "waiting_for_body" | null;
  errorType: "configuration" | "timeout" | "network_error" | null;
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

export async function probeAuthenticatedArkInference(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = AUTHENTICATED_ARK_TIMEOUT_MS,
): Promise<AuthenticatedArkProbeResult> {
  const started = Date.now();
  const apiKey = process.env.ARK_API_KEY?.trim() || "";
  const model = process.env.ARK_MODEL_ID?.trim() || "";
  if (!apiKey || !model) {
    return {
      provider: "ark", modelConfigured: Boolean(model), headersReceived: false, elapsedToHeadersMs: null,
      httpStatus: null, contentType: null, bodyCompleted: false, elapsedToBodyMs: null,
      totalElapsedMs: Date.now() - started, responseSize: null, timeoutStage: "configuration", errorType: "configuration",
    };
  }

  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(PROVIDER_ENDPOINTS.ark, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK." }],
        max_tokens: 8,
        temperature: 0,
        stream: false,
      }),
      redirect: "manual",
      signal,
    });
  } catch (error) {
    const timeout = isTimeout(error);
    return {
      provider: "ark", modelConfigured: true, headersReceived: false, elapsedToHeadersMs: null,
      httpStatus: null, contentType: null, bodyCompleted: false, elapsedToBodyMs: null,
      totalElapsedMs: Date.now() - started, responseSize: null, timeoutStage: timeout ? "waiting_for_headers" : null,
      errorType: timeout ? "timeout" : "network_error",
    };
  }

  const headersReceived = Date.now();
  const contentType = response.headers.get("content-type")?.slice(0, 120) || null;
  try {
    const responseBody = await response.text();
    const bodyCompleted = Date.now();
    return {
      provider: "ark", modelConfigured: true, headersReceived: true, elapsedToHeadersMs: headersReceived - started,
      httpStatus: response.status, contentType, bodyCompleted: true, elapsedToBodyMs: bodyCompleted - started,
      totalElapsedMs: bodyCompleted - started, responseSize: responseBody.length, timeoutStage: null, errorType: null,
    };
  } catch (error) {
    const timeout = isTimeout(error);
    return {
      provider: "ark", modelConfigured: true, headersReceived: true, elapsedToHeadersMs: headersReceived - started,
      httpStatus: response.status, contentType, bodyCompleted: false, elapsedToBodyMs: null,
      totalElapsedMs: Date.now() - started, responseSize: null, timeoutStage: timeout ? "waiting_for_body" : null,
      errorType: timeout ? "timeout" : "network_error",
    };
  }
}

type ArkDiagnosticCase = "A" | "B" | "B-prime" | "C";

const diagnosticCreativeInput: CreativeBrainInput = {
  projectId: "diagnostic-preview",
  productContext: {
    productName: "CrystalArmor Screen Protector",
    profileId: 7,
    productKnowledge: {
      id: 7, name: "CrystalArmor Screen Protector", brand: "CrystalArmor", category: "Phone accessory",
      sellingPoints: "alignment applicator; dust-removal strip; privacy viewing; oleophobic and hydrophobic surface; reduced fingerprint impact; smooth daily swiping; compatible with most phone cases",
      parameters: "privacy viewing", bannedWords: "absolute claims; exact installation seconds; package quantity; price comparisons; competitor disparagement; invented capabilities",
      markets: "Spain", audience: "phone users", price: "", offer: "", notes: "UGC TikTok; avoid destructive testing",
    },
  },
  market: "Spain", language: "Spanish", platform: "TikTok",
  preferences: { creationMode: "UGC", hookStrategy: "curiosity", framework: "AIDA" },
  recentCreativeHistory: [], candidateCount: 3,
};

function diagnosticMessages(testCase: ArkDiagnosticCase) {
  if (testCase === "A") return [{ role: "user" as const, content: 'Return exactly one JSON object with key "ok".' }];
  const messages = creativeBrainMessages(diagnosticCreativeInput);
  if (testCase === "B" || testCase === "B-prime") {
    const context = JSON.parse(messages[1].content) as Record<string, unknown>;
    context.candidateCount = 1;
    return [messages[0], { ...messages[1], content: JSON.stringify(context) }];
  }
  return messages;
}

export async function probeArkDifferentialCase(testCase: ArkDiagnosticCase, fetchImpl: typeof fetch = fetch) {
  const started = Date.now();
  const apiKey = process.env.ARK_API_KEY?.trim() || "";
  const model = process.env.ARK_MODEL_ID?.trim() || "";
  const empty = { test: testCase, modelConfigured: Boolean(model), headersReceived: false, elapsedToHeadersMs: null, httpStatus: null, contentType: null, bodyCompleted: false, elapsedToBodyMs: null, totalElapsedMs: 0, responseSize: null, timeoutStage: "configuration" as "configuration" | "waiting_for_headers" | "waiting_for_body" | null, errorType: "configuration" as "configuration" | "timeout" | "network_error" | null };
  if (!apiKey || !model) return { ...empty, totalElapsedMs: Date.now() - started };
  const signal = AbortSignal.timeout(15_000);
  let response: Response;
  try {
    response = await fetchImpl(PROVIDER_ENDPOINTS.ark, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, redirect: "manual", signal,
      body: JSON.stringify({ model, messages: diagnosticMessages(testCase), max_tokens: testCase === "A" || testCase === "B-prime" ? 8 : testCase === "B" ? 600 : 2400, temperature: testCase === "A" || testCase === "B-prime" ? 0 : .88, stream: false, response_format: { type: "json_object" } }),
    });
  } catch (error) {
    const timeout = isTimeout(error);
    return { ...empty, modelConfigured: true, totalElapsedMs: Date.now() - started, timeoutStage: timeout ? "waiting_for_headers" as const : null, errorType: timeout ? "timeout" as const : "network_error" as const };
  }
  const headersAt = Date.now(), contentType = response.headers.get("content-type")?.slice(0, 120) || null;
  try {
    const text = await response.text(); const bodyAt = Date.now();
    return { test: testCase, modelConfigured: true, headersReceived: true, elapsedToHeadersMs: headersAt - started, httpStatus: response.status, contentType, bodyCompleted: true, elapsedToBodyMs: bodyAt - started, totalElapsedMs: bodyAt - started, responseSize: text.length, timeoutStage: null, errorType: null };
  } catch (error) {
    const timeout = isTimeout(error);
    return { ...empty, modelConfigured: true, headersReceived: true, elapsedToHeadersMs: headersAt - started, httpStatus: response.status, contentType, totalElapsedMs: Date.now() - started, timeoutStage: timeout ? "waiting_for_body" as const : null, errorType: timeout ? "timeout" as const : "network_error" as const };
  }
}

export async function runArkDifferentialProbe(fetchImpl: typeof fetch = fetch) {
  const results = [];
  for (const testCase of ["A", "B", "C"] as const) {
    const result = await probeArkDifferentialCase(testCase, fetchImpl);
    results.push(result);
    if (!result.headersReceived || !result.bodyCompleted || result.httpStatus === null || result.httpStatus < 200 || result.httpStatus >= 300) break;
  }
  return results;
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") return Response.json({ error: "Not found" }, { status: 404 });
  let body: unknown = null;
  try { body = await request.json(); } catch {}
  if (body && typeof body === "object" && "action" in body && body.action === "authenticatedArkInference") {
    if (Object.keys(body).some(key => key !== "action")) return Response.json({ error: "Unsupported diagnostic input" }, { status: 400 });
    return Response.json({ authenticatedArkInference: await probeAuthenticatedArkInference() });
  }
  if (body && typeof body === "object" && "action" in body && body.action === "arkDifferentialProbe") {
    if (Object.keys(body).some(key => key !== "action")) return Response.json({ error: "Unsupported diagnostic input" }, { status: 400 });
    return Response.json({ arkDifferentialProbe: await runArkDifferentialProbe() });
  }
  if (body && typeof body === "object" && "action" in body && body.action === "arkBPrimeProbe") {
    if (Object.keys(body).some(key => key !== "action")) return Response.json({ error: "Unsupported diagnostic input" }, { status: 400 });
    return Response.json({ arkBPrimeProbe: await probeArkDifferentialCase("B-prime") });
  }
  if (body && typeof body === "object" && Object.keys(body).length > 0) {
    return Response.json({ error: "Arbitrary URLs are not supported" }, { status: 400 });
  }
  const [ark, deepseek] = await Promise.all([
    probeProvider("ark"),
    probeProvider("deepseek"),
  ]);
  return Response.json({ probes: [ark, deepseek] });
}
import { creativeBrainMessages, type CreativeBrainInput } from "../../../creative-brain";
