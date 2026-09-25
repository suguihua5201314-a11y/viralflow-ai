import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { moduleCache: false, interopDefault: true });
const route = await jiti.import("../app/api/diagnostics/provider-connectivity/route.ts");
const originalFetch = globalThis.fetch;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalArkKey = process.env.ARK_API_KEY;
const originalArkModel = process.env.ARK_MODEL_ID;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
  if (originalArkKey === undefined) delete process.env.ARK_API_KEY;
  else process.env.ARK_API_KEY = originalArkKey;
  if (originalArkModel === undefined) delete process.env.ARK_MODEL_ID;
  else process.env.ARK_MODEL_ID = originalArkModel;
});

test("probe endpoints are fixed, unauthenticated, and do not read response bodies", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status: 401, headers: new Headers({ "content-type": "application/json" }), text: () => assert.fail("body must not be read") };
  };
  const ark = await route.probeProvider("ark", fetchImpl, 20);
  const deepseek = await route.probeProvider("deepseek", fetchImpl, 20);
  assert.deepEqual(calls.map(call => call.url), [
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    "https://api.deepseek.com/chat/completions",
  ]);
  for (const call of calls) {
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.headers.authorization, undefined);
    assert.equal(call.init.body, "{}");
  }
  assert.equal(ark.headersReceived, true);
  assert.equal(deepseek.httpStatus, 401);
});

test("timeout is classified as waiting_for_headers", async () => {
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  const result = await route.probeProvider("ark", async () => { throw timeout; }, 5);
  assert.equal(result.headersReceived, false);
  assert.equal(result.timeoutStage, "waiting_for_headers");
  assert.equal(result.httpStatus, null);
});

test("route rejects arbitrary URL input before any fetch", async () => {
  process.env.VERCEL_ENV = "preview";
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 401 }); };
  const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("production guard blocks probes", async () => {
  process.env.VERCEL_ENV = "production";
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 401 }); };
  const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", { method: "POST" }));
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});

test("preview response contains only safe connectivity metadata", async () => {
  process.env.VERCEL_ENV = "preview";
  globalThis.fetch = async () => new Response("secret response body", {
    status: 403,
    headers: { "content-type": "application/json", authorization: "Bearer secret-token" },
  });
  const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", { method: "POST" }));
  assert.equal(response.status, 200);
  const text = await response.text();
  const data = JSON.parse(text);
  assert.equal(data.probes.length, 2);
  for (const forbidden of ["secret response body", "secret-token", "authorization", "Bearer", "apiKey", "model"]){
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("authenticated Ark inference uses one fixed minimal request and returns only safe metadata", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.ARK_API_KEY = "test-ark-secret";
  process.env.ARK_MODEL_ID = "test-model-secret";
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('{"choices":[{"message":{"content":"OK"}}]}', { status: 200, headers: { "content-type": "application/json" } });
  };
  const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "authenticatedArkInference" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ark.cn-beijing.volces.com/api/v3/chat/completions");
  const requestBody = JSON.parse(calls[0].init.body);
  assert.deepEqual(requestBody.messages, [{ role: "user", content: "Reply with OK." }]);
  assert.equal(requestBody.max_tokens, 8);
  assert.equal(requestBody.temperature, 0);
  assert.equal(requestBody.stream, false);
  assert.equal("response_format" in requestBody, false);
  const text = await response.text();
  const result = JSON.parse(text).authenticatedArkInference;
  assert.equal(result.headersReceived, true);
  assert.equal(result.bodyCompleted, true);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.modelConfigured, true);
  for (const forbidden of ["test-ark-secret", "test-model-secret", "Reply with OK.", "authorization", "Bearer", "choices", "OK"]){
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("authenticated action rejects caller-supplied URL, key, model, or prompt", async () => {
  process.env.VERCEL_ENV = "preview";
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 200 }); };
  for (const extra of [{ url: "https://example.com" }, { apiKey: "x" }, { model: "x" }, { prompt: "x" }]) {
    const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "authenticatedArkInference", ...extra }),
    }));
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test("authenticated Ark probe distinguishes header and body timeout stages", async () => {
  process.env.ARK_API_KEY = "test-key";
  process.env.ARK_MODEL_ID = "test-model";
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  const headerTimeout = await route.probeAuthenticatedArkInference(async () => { throw timeout; }, 5);
  assert.equal(headerTimeout.timeoutStage, "waiting_for_headers");
  assert.equal(headerTimeout.headersReceived, false);
  const bodyTimeout = await route.probeAuthenticatedArkInference(async () => ({
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => { throw timeout; },
  }), 5);
  assert.equal(bodyTimeout.timeoutStage, "waiting_for_body");
  assert.equal(bodyTimeout.headersReceived, true);
  assert.equal(bodyTimeout.bodyCompleted, false);
});

test("missing Ark configuration returns diagnostics without a provider request", async () => {
  delete process.env.ARK_API_KEY;
  delete process.env.ARK_MODEL_ID;
  let calls = 0;
  const result = await route.probeAuthenticatedArkInference(async () => { calls += 1; return new Response(null); });
  assert.equal(calls, 0);
  assert.equal(result.errorType, "configuration");
  assert.equal(result.timeoutStage, "configuration");
  assert.equal(result.modelConfigured, false);
});

test("Ark differential probe runs A, B, C once with production messages and scaled output", async () => {
  process.env.ARK_API_KEY = "test-key";
  process.env.ARK_MODEL_ID = "test-model";
  const calls = [];
  const results = await route.runArkDifferentialProbe(async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(results.length, 3);
  assert.deepEqual(calls.map(call => call.body.max_tokens), [8, 600, 2400]);
  assert.deepEqual(calls.map(call => call.body.response_format), [{ type: "json_object" }, { type: "json_object" }, { type: "json_object" }]);
  assert.equal(calls[0].body.messages.length, 1);
  assert.equal(calls[1].body.messages.length, 2);
  assert.equal(JSON.parse(calls[1].body.messages[1].content).candidateCount, 1);
  assert.equal(JSON.parse(calls[2].body.messages[1].content).candidateCount, 3);
  assert.equal(calls.every(call => call.url === "https://ark.cn-beijing.volces.com/api/v3/chat/completions"), true);
});

test("Ark differential probe stops after first timeout or HTTP failure", async () => {
  process.env.ARK_API_KEY = "test-key";
  process.env.ARK_MODEL_ID = "test-model";
  let calls = 0;
  const failed = await route.runArkDifferentialProbe(async () => { calls += 1; return new Response("{}", { status: 400 }); });
  assert.equal(calls, 1); assert.equal(failed.length, 1); assert.equal(failed[0].test, "A");
  calls = 0;
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  const timedOut = await route.runArkDifferentialProbe(async () => { calls += 1; throw timeout; });
  assert.equal(calls, 1); assert.equal(timedOut[0].timeoutStage, "waiting_for_headers");
});

test("differential route rejects caller overrides and exposes no request content", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.ARK_API_KEY = "test-key";
  process.env.ARK_MODEL_ID = "test-model";
  globalThis.fetch = async () => new Response("private body", { status: 200 });
  const rejected = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "arkDifferentialProbe", prompt: "override" }) }));
  assert.equal(rejected.status, 400);
  const response = await route.POST(new Request("http://localhost/api/diagnostics/provider-connectivity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "arkDifferentialProbe" }) }));
  const text = await response.text();
  for (const forbidden of ["test-key", "test-model", "private body", "Reply with OK.", "CrystalArmor", "authorization", "Bearer"]) assert.equal(text.includes(forbidden), false, forbidden);
});
