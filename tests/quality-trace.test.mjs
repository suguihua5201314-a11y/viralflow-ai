import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { moduleCache: false });
const trace = await jiti.import("../app/quality-trace.ts");
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("A/B/D/F/G: one stable trace id has explicit skipped stages and accepts full lineage", async () => {
  const id = trace.createQualityTraceId();
  assert.match(id, /^quality-trace:[0-9a-f-]{36}$/i);
  const base = trace.emptyQualityTrace(id, "2026-01-01T00:00:00.000Z");
  assert.equal(base.writer.attempt1, "NOT_EXECUTED");
  assert.equal(base.rewrite, "NOT_EXECUTED");
  const merged = trace.mergeQualityTrace(base, { qualityTraceId: id, productContext: { snapshot: { productName: "测试商品" }, fingerprint: "fp" }, finalScript: { title: "最终脚本" } }, "2026-01-02T00:00:00.000Z");
  assert.equal(merged.productContext.fingerprint, "fp");
  assert.equal(merged.finalScript.title, "最终脚本");
});

test("C/E/H: durable storage merge preserves writer repair and C-4 across a fresh reader", async () => {
  const records = new Map();
  const storage = { read: async id => structuredClone(records.get(id) || null), write: async value => { records.set(value.qualityTraceId, structuredClone(value)); } };
  const id = trace.createQualityTraceId();
  await trace.persistQualityTracePatchWith({ qualityTraceId: id, writer: { attempt0: { output: "bad" }, attempt1: { output: "fixed" }, acceptedDraft: { title: "draft" } } }, storage);
  await trace.persistQualityTracePatchWith({ qualityTraceId: id, rewrite: { input: { before: "旧", issues: ["问题"] }, output: { replacement: "新", after: "新" } } }, storage);
  const restored = await storage.read(id);
  assert.equal(restored.writer.attempt1.output, "fixed");
  assert.equal(restored.rewrite.output.after, "新");
});

test("I: storage failure is best effort and never throws into generation", async () => {
  const ok = await trace.persistQualityTracePatchWith({ qualityTraceId: trace.createQualityTraceId(), finalScript: { unchanged: true } }, { read: async () => { throw new Error("offline"); }, write: async () => { throw new Error("offline"); } });
  assert.equal(ok, false);
});

test("J: Production is closed and Preview/dev is enabled", () => {
  assert.equal(trace.qualityTraceEnabled("production", "production"), false);
  assert.equal(trace.qualityTraceEnabled("preview", "production"), true);
  assert.equal(trace.qualityTraceEnabled(undefined, "development"), true);
});

test("K/L: instrumentation does not add provider calls or change generation outputs", async () => {
  const [runtime, writerRoute, criticRoute, rewriteRoute, page, readRoute] = await Promise.all([read("app/brief-driven-script-writer.ts"), read("app/api/script-writer/route.ts"), read("app/api/script-critic/route.ts"), read("app/api/script-rewriter/route.ts"), read("app/page.tsx"), read("app/api/quality-trace/[qualityTraceId]/route.ts")]);
  assert.match(runtime, /captureAttempt\?:/);
  assert.match(runtime, /options\.captureAttempt\?\./);
  assert.equal((writerRoute.match(/callProvider\(/g) || []).length, 1);
  assert.equal((criticRoute.match(/callProvider\(/g) || []).length, 1);
  assert.equal((rewriteRoute.match(/callProvider\(/g) || []).length, 1);
  assert.match(page, /qualityTraceId=createQualityTraceId\(\)/);
  assert.match(page, /sourceBriefId|creativeBriefReference/);
  assert.match(readRoute, /qualityTraceReadAuthorized/);
  assert.match(readRoute, /status: 404/);
  assert.match(writerRoute, /qualityTraceId: body\.qualityTraceId/);
  assert.doesNotMatch([runtime, writerRoute, criticRoute, rewriteRoute].join("\n"), /buildBriefDrivenWriterMessages\([^)]*qualityTrace|temperature.*qualityTrace|provider.*qualityTraceId/);
});

test("trace contract stores no credential or provider HTTP metadata fields", async () => {
  const source = await read("app/quality-trace.ts");
  assert.doesNotMatch(source, /cookie|authorizationHeader|apiKey|providerRawHttp/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
