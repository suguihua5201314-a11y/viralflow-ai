import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const markets = await jiti.import("../app/market-identity.ts");
const guard = await jiti.import("../app/final-script-request-guard.ts");
const writer = await jiti.import("../app/brief-driven-script-writer.ts");
const fixtures = await import("./targeted-script-rewrite-fixtures.mjs");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

function writerInput(profileMarket, requestMarket) {
  const productContext = fixtures.context();
  productContext.productKnowledge.markets = profileMarket;
  const creativeBrief = fixtures.brief(selection.productContextFingerprint(productContext));
  return {
    projectId: "project-a", requestId: "request-a",
    creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId },
    creativeBrief, productContext,
    productContextFingerprint: selection.productContextFingerprint(productContext),
    platform: "TikTok", market: requestMarket,
    languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: requestMarket, platform: "TikTok" },
    preferences: { variantCount: 1 },
  };
}

test("canonical market identity recognizes equivalent display labels", () => {
  for (const value of ["Spain", "西班牙", "España", "ES", "es-ES"]) assert.equal(markets.normalizeMarketIdentity(value), "ES", value);
  for (const value of ["United States", "美国", "US"]) assert.equal(markets.normalizeMarketIdentity(value), "US", value);
});

test("unknown markets remain distinct and genuine market mismatch stops before Provider", async () => {
  assert.notEqual(markets.normalizeMarketIdentity("Market Alpha"), markets.normalizeMarketIdentity("Market Beta"));
  let calls = 0;
  const result = await writer.generateBriefDrivenScript(writerInput("United States", "Spain"), async () => { calls += 1; throw new Error("must not run"); });
  assert.equal(result.status, "failure");
  assert.ok(result.issues.some((issue) => issue.code === "market_mismatch" && issue.path === "market"));
  assert.equal(calls, 0);
});

test("real failure fixture Spain and 西班牙 reaches Provider boundary", async () => {
  let calls = 0;
  const result = await writer.generateBriefDrivenScript(writerInput("西班牙", "Spain"), async () => { calls += 1; throw new Error("provider boundary reached"); });
  assert.equal(calls, 1);
  assert.equal(result.issues.some((issue) => issue.code === "market_mismatch"), false);
});

const context = (overrides = {}) => ({
  requestId: "A", activeRequestId: "A", projectId: "project-a", activeProjectId: "project-a",
  briefRevisionId: "brief-a", activeBriefRevisionId: "brief-a",
  productContextFingerprint: "fp-a", activeProductContextFingerprint: "fp-a", ...overrides,
});

test("request-bound guard releases a sole stale request but never clears a newer request", () => {
  const stale = guard.finalScriptRequestAuthority(context({ activeBriefRevisionId: "brief-b" }));
  assert.equal(stale, "context_stale");
  assert.equal(guard.shouldReleaseFinalScriptLoading(stale), true);
  const superseded = guard.finalScriptRequestAuthority(context({ activeRequestId: "B" }));
  assert.equal(superseded, "superseded");
  assert.equal(guard.shouldReleaseFinalScriptLoading(superseded), false);
  assert.equal(guard.finalScriptRequestAuthority(context({ requestId: "B", activeRequestId: "B" })), "current");
});

test("Final Script UI handles structured and unexpected failures without an unguarded stale return", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /progress=>\{if\(authority\(\)===\"current\"\)setFinalScriptStatus\(progress\);\}/);
  assert.match(page, /shouldReleaseFinalScriptLoading\(settledAuthority\)/);
  assert.match(page, /shouldReleaseFinalScriptLoading\(failedAuthority\)/);
  assert.match(page, /catch\(value\).*setFinalScriptStatus\(\"error\"\)/s);
  assert.match(page, /market_mismatch.*当前商品市场信息不一致，请返回商品信息检查后重试。/s);
  assert.doesNotMatch(page, /activeScriptGenerationIdentity\.current!==requestId\|\|activeProjectId\.current!==projectId[^\n]+return;/);
});
