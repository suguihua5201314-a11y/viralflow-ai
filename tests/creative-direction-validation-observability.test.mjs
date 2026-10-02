import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/creative-directions.ts");
const productApi = await jiti.import("../app/product-context.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const route = await jiti.import("../app/api/creative-brain/route.ts");

const profile = { id: 91, name: "Safe Test Product", brand: "Safe", category: "Accessory", sellingPoints: "辅助对位；防窥效果；疏油表面；日常滑动顺滑", parameters: "兼容大部分手机壳", bannedWords: "绝对防摔", markets: "Spain", audience: "手机用户", price: "", offer: "", notes: "" };
const productContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: profile.id, profiles: [profile] });
const input = { projectId: "project-observe", productContext, productContextFingerprint: selection.productContextFingerprint(productContext), productBinding: { projectProductName: profile.name, projectProductProfileId: profile.id }, workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok", recentCreativeHistory: [] };
const variants = {
  A: ["通勤用户", "地铁邻座场景", "保护屏幕隐私", "侧面视线干扰", "通勤防窥视角", "正侧视角切换", "侧面还能看清吗？", "手机", "地铁座位", "从正面转到侧面", "屏幕内容逐渐不可见"],
  B: ["首次贴膜用户", "家中桌面", "减少返工", "灰尘影响安装", "安装过程证明", "手部步骤演示", "看看除尘条带走了什么", "除尘条", "整洁桌面", "沿屏幕滑过", "灰尘在贴合前被带走"],
  C: ["高频手机用户", "工作日结束", "保持日常滑动顺手", "表面指纹", "滑动体验观察", "擦拭后滑动", "擦完再滑是什么感觉？", "指尖", "窗边自然光", "擦拭后滑动屏幕", "反光中观察表面状态"],
};
const direction = (id, patch = {}) => { const value = variants[id]; return { id, targetAudience: value[0], useMoment: value[1], coreMotivation: value[2], coreTension: value[3], creativeAngle: value[4], contentMechanism: value[5], hookLine: value[6], openingVisual: { subject: value[7], setup: value[8], action: value[9], visibleChangeOrQuestion: value[10] }, rationale: "基于事实边界的可拍方向", ...patch }; };
const payload = directions => JSON.stringify({ directions });
const providerResponse = content => ({ content, providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: 1 });

test("double validation failure exposes safe attempt diagnostics and stops after one repair", async () => {
  let calls = 0;
  const observed = [];
  const bad = direction("A", { hookLine: "贴膜后摔落，屏幕完好无损" });
  const result = await runtime.generateCreativeDirections(input, async () => { calls++; return providerResponse(payload([bad])); }, { observe: diagnostic => observed.push(diagnostic) });
  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "insufficient_candidates");
  assert.deepEqual(result.validationDiagnostics.attempts.map(item => item.attempt), [0, 1]);
  assert.deepEqual(observed, result.validationDiagnostics.attempts);
  for (const attempt of result.validationDiagnostics.attempts) {
    assert.equal(attempt.receivedCandidateCount, 1);
    assert.equal(attempt.parsedCandidateCount, 1);
    assert.equal(attempt.validCandidateCount, 0);
    assert.equal(attempt.rejectedCandidateCount, 1);
    assert.equal(attempt.preservedCandidateCount, 0);
    assert.equal(attempt.diversityPassed, false);
    assert.ok(attempt.candidates.some(candidate => candidate.candidateId === "A" && candidate.issues.some(issue => issue.issueCode === "unsupported_product_result" && issue.path === "hookLine")));
  }
  const failure = route.creativeBrainFailurePayload(result);
  const serialized = JSON.stringify(failure);
  assert.equal(failure.error.type, "insufficient_candidates");
  assert.equal(failure.validationSummary.issues.length, 0);
  for (const secret of [bad.hookLine, profile.name, profile.sellingPoints, "productKnowledge", "Provider raw response"]) assert.doesNotMatch(serialized, new RegExp(secret));
  assert.equal(result.metadata.fallbackUsed, false);
});

test("initial success remains one call with unchanged accepted directions", async () => {
  let calls = 0;
  const result = await runtime.generateCreativeDirections(input, async () => { calls++; return providerResponse(payload([direction("A"), direction("B"), direction("C")])); });
  assert.equal(calls, 1);
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map(item => item.id), ["A", "B", "C"]);
  assert.equal(result.metadata.repairAttempted, false);
  assert.equal(result.validationDiagnostics.attempts.length, 1);
});

test("repair success records preserved and repair candidates without changing repair semantics", async () => {
  let calls = 0;
  const result = await runtime.generateCreativeDirections(input, async () => {
    calls++;
    return providerResponse(calls === 1 ? payload([direction("A"), direction("B")]) : payload([direction("C")]));
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map(item => item.id), ["A", "B", "C"]);
  assert.equal(result.validationDiagnostics.attempts[0].preservedCandidateCount, 2);
  assert.ok(result.validationDiagnostics.attempts[1].candidates.some(item => item.source === "preserved" && item.outcome === "preserved"));
  assert.ok(result.validationDiagnostics.attempts[1].candidates.some(item => item.candidateId === "C" && item.source === "repair" && item.outcome === "valid"));
});

test("diagnostic issue mapping covers existing validators without changing their decisions", () => {
  assert.equal(runtime.parseCreativeDirections("not json").directions.length, 0);
  assert.ok(runtime.validateCreativeDirection(direction("A", { hookLine: "保证17秒完成安装" }), input).some(issue => issue.type === "truth"));
  assert.ok(runtime.validateCreativeDirection(direction("A", { hookLine: "100%绝对防摔" }), input).some(issue => issue.type === "compliance"));
  assert.equal(runtime.assessDirectionDiversity([direction("A"), direction("B"), direction("C")]).passed, true);
});
