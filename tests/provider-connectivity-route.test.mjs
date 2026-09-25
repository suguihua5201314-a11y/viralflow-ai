import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { moduleCache: false, interopDefault: true });
const route = await jiti.import("../app/api/diagnostics/provider-connectivity/route.ts");
const originalFetch = globalThis.fetch;
const originalVercelEnv = process.env.VERCEL_ENV;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
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
