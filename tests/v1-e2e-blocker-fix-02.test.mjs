import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { context, brief } from "./targeted-script-rewrite-fixtures.mjs";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const markets = await jiti.import("../app/market-identity.ts");
const writer = await jiti.import("../app/brief-driven-script-writer.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

function input(profileMarkets, requestMarket = "Spain") {
  const productContext = context();
  productContext.productKnowledge.markets = profileMarkets;
  const fingerprint = selection.productContextFingerprint(productContext);
  const creativeBrief = brief(fingerprint);
  return {
    projectId: "project-a", requestId: "request-a",
    creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId },
    creativeBrief, productContext, productContextFingerprint: fingerprint,
    platform: "TikTok", market: requestMarket,
    languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: requestMarket, platform: "TikTok" },
    preferences: { variantCount: 1 },
  };
}

test("shared market-list parser supports every Product Knowledge delimiter", () => {
  for (const value of ["西班牙、意大利", "西班牙，意大利", "西班牙,意大利", "西班牙；意大利", "西班牙;意大利", "西班牙\n意大利"]) {
    assert.deepEqual(markets.parseMarketIdentities(value), ["ES", "IT"], value);
  }
});

test("market-list parser composes with canonical aliases", () => {
  assert.deepEqual(markets.parseMarketIdentities("España、Italy、美国、United Kingdom"), ["ES", "IT", "US", "GB"]);
});

test("empty and duplicate entries collapse deterministically", () => {
  assert.deepEqual(markets.parseMarketIdentities("西班牙、、Spain，ES;;\n"), ["ES"]);
});

test("unknown market identities remain distinct and individually matchable", () => {
  assert.deepEqual(markets.parseMarketIdentities("Market Alpha、Market Beta"), ["unknown:market alpha", "unknown:market beta"]);
  assert.equal(markets.parseMarketIdentities("Market Beta").includes(markets.normalizeMarketIdentity("Market Alpha")), false);
  assert.equal(markets.parseMarketIdentities("Market Alpha、Market Beta").includes(markets.normalizeMarketIdentity("Market Alpha")), true);
});

test("real second-failure fixture reaches the mock Provider boundary", async () => {
  let calls = 0;
  const result = await writer.generateBriefDrivenScript(input("西班牙、意大利、美国、英国"), async () => { calls += 1; throw new Error("mock provider boundary"); });
  assert.equal(calls, 1);
  assert.equal(result.issues.some((issue) => issue.code === "market_mismatch"), false);
});

test("genuine mismatch remains explicit before Provider", async () => {
  let calls = 0;
  const result = await writer.generateBriefDrivenScript(input("美国、德国"), async () => { calls += 1; throw new Error("must not run"); });
  assert.equal(result.status, "failure");
  assert.ok(result.issues.some((issue) => issue.code === "market_mismatch" && issue.path === "market"));
  assert.equal(calls, 0);
});
