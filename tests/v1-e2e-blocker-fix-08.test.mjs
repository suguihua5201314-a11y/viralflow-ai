import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const preflight = await jiti.import("../app/final-script-client-preflight.ts");
const diagnostics = await jiti.import("../app/client-diagnostics.ts");
const route = await jiti.import("../app/api/client-diagnostics/route.ts");

async function exercise(prepare) {
  const emitted = [];
  let writerCalls = 0;
  const transport = (event) => { emitted.push(event); };
  preflight.emitFinalScriptClientEvent({ event: "script_generation_clicked", correlationId: "client-test" }, transport);
  preflight.emitFinalScriptClientEvent({ event: "script_preflight_started", correlationId: "client-test" }, transport);
  const result = preflight.runFinalScriptPreflight(prepare);
  if (!result.ok) {
    preflight.emitFinalScriptClientEvent({ event: "script_preflight_failed", correlationId: "client-test", reasonCode: result.reasonCode }, transport);
    return { emitted, writerCalls, result };
  }
  await preflight.observedWriterFetch("client-test", "/api/script-writer", { method: "POST" }, async () => {
    writerCalls += 1;
    return new Response("{}", { status: 200 });
  }, transport);
  return { emitted, writerCalls, result };
}

test("missing Brief emits a safe server diagnostic, maps a useful UI reason, and never calls Writer", async () => {
  const result = await exercise(() => { throw new preflight.FinalScriptPreflightError("missing_current_creative_brief"); });
  assert.equal(result.writerCalls, 0);
  assert.deepEqual(result.emitted.at(-1), {
    event: "script_preflight_failed", clientCorrelationId: "client-test", stage: "script_preflight",
    route: "/api/script-writer", status: "failed", reasonCode: "missing_current_creative_brief",
  });
  assert.equal(diagnostics.finalScriptPreflightUserMessage(result.result.reasonCode), "当前创意依据不可用，请返回「创意」重新确认创意方向。");
});

test("invalid Product Context and missing market/platform retain exact safe reason codes with zero Writer calls", async () => {
  for (const [reasonCode, message] of [
    ["invalid_product_context", "当前商品信息不完整，请返回「商品」检查商品资料。"],
    ["missing_market_or_platform", "当前市场或平台信息不完整，请返回「商品」检查设置。"],
  ]) {
    const result = await exercise(() => { throw new preflight.FinalScriptPreflightError(reasonCode); });
    assert.equal(result.writerCalls, 0);
    assert.equal(result.emitted.at(-1).reasonCode, reasonCode);
    assert.equal(diagnostics.finalScriptPreflightUserMessage(reasonCode), message);
  }
});

test("unexpected preflight exceptions expose no raw exception and use the generic safe UI message", async () => {
  const secretText = "raw exception with private product and token";
  const result = await exercise(() => { throw new Error(secretText); });
  assert.equal(result.writerCalls, 0);
  assert.equal(result.emitted.at(-1).reasonCode, "preflight_exception");
  assert.doesNotMatch(JSON.stringify(result.emitted), new RegExp(secretText));
  assert.equal(diagnostics.finalScriptPreflightUserMessage("preflight_exception"), "脚本生成准备失败，请重试。");
});

test("valid preflight calls Writer exactly once and exposes the Fix 06 fetch lifecycle", async () => {
  const result = await exercise(() => ({ valid: true }));
  assert.equal(result.writerCalls, 1);
  assert.deepEqual(result.emitted.map((event) => event.event), [
    "script_generation_clicked", "script_preflight_started", "writer_fetch_started", "writer_fetch_settled",
  ]);
  assert.equal(result.emitted.at(-1).status, "success");
  assert.equal(result.emitted.at(-1).statusClass, "2xx");
});

test("unavailable or slow diagnostics cannot block or materially delay the Writer request", async () => {
  let writerCalls = 0;
  const unavailable = () => { throw new Error("diagnostic unavailable"); };
  await preflight.observedWriterFetch("client-unavailable", "/api/script-writer", {}, async () => {
    writerCalls += 1;
    return new Response("{}", { status: 200 });
  }, unavailable);
  const neverSettles = () => new Promise(() => {});
  const started = performance.now();
  await preflight.observedWriterFetch("client-slow", "/api/script-writer", {}, async () => {
    writerCalls += 1;
    return new Response("{}", { status: 200 });
  }, neverSettles);
  assert.equal(writerCalls, 2);
  assert.ok(performance.now() - started < 100, "diagnostic transport was awaited before Writer");
});

test("diagnostic endpoint accepts only the strict lifecycle schema and logs no content fields", async () => {
  const safe = {
    event: "script_preflight_failed", clientCorrelationId: "client-safe-1", stage: "script_preflight",
    reasonCode: "invalid_product_context", route: "/api/script-writer", status: "failed",
  };
  const logs = [];
  const original = console.info;
  console.info = (value) => logs.push(String(value));
  try {
    const response = await route.POST(new Request("http://local/api/client-diagnostics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(safe) }));
    assert.equal(response.status, 202);
  } finally { console.info = original; }
  assert.equal(logs.length, 1);
  assert.match(logs[0], /client-safe-1/);
  for (const forbidden of ["script", "creativeBrief", "productContext", "prompt", "credentials", "token", "stack"]) assert.equal(logs[0].includes(`\"${forbidden}\"`), false);

  for (const unsafe of [
    { ...safe, reasonCode: "arbitrary_reason" },
    { ...safe, extra: "log injection" },
    { ...safe, reasonCode: { nested: true } },
    { ...safe, route: "https://attacker.example/collect" },
    { ...safe, clientCorrelationId: "bad id with spaces" },
  ]) {
    const response = await route.POST(new Request("http://local/api/client-diagnostics", { method: "POST", body: JSON.stringify(unsafe) }));
    assert.equal(response.status, 400);
  }
  const oversized = "x".repeat(diagnostics.FINAL_SCRIPT_CLIENT_DIAGNOSTIC_MAX_BYTES + 1);
  const response = await route.POST(new Request("http://local/api/client-diagnostics", { method: "POST", body: oversized }));
  assert.equal(response.status, 413);
});

test("all required events have deterministic server-safe representations", () => {
  const events = [
    { event: "script_generation_clicked", correlationId: "c1" },
    { event: "script_preflight_started", correlationId: "c1" },
    { event: "script_preflight_failed", correlationId: "c1", reasonCode: "preflight_exception" },
    { event: "writer_fetch_started", correlationId: "c1" },
    { event: "writer_fetch_settled", correlationId: "c1", result: "http_error", statusClass: "4xx" },
  ];
  for (const event of events) {
    const value = preflight.toFinalScriptClientDiagnostic(event);
    assert.deepEqual(diagnostics.parseFinalScriptClientDiagnostic(value), value);
  }
});

test("page uses safe reason mapping without changing preflight acceptance rules", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /finalScriptPreflightUserMessage/);
  assert.match(page, /missing_current_creative_brief/);
  assert.match(page, /invalid_product_context/);
  assert.match(page, /missing_market_or_platform/);
  assert.match(page, /observedWriterFetch\(clientCorrelationId,"\/api\/script-writer"/);
});
