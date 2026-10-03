import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const directions = await jiti.import("../app/creative-directions.ts");
const compliance = await jiti.import("../app/compliance-rules.ts");
const productApi = await jiti.import("../app/product-context.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

const profile = { id: 707, name: "Diagnostic Product", brand: "Safe", category: "Accessory", sellingPoints: "辅助对位；防窥效果；疏油表面；日常滑动顺滑", parameters: "兼容大部分手机壳", bannedWords: "绝对防摔", markets: "Spain", audience: "手机用户", price: "", offer: "", notes: "" };
const productContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: profile.id, profiles: [profile] });
const input = { projectId: "diagnostic-07", productContext, productContextFingerprint: selection.productContextFingerprint(productContext), productBinding: { projectProductName: profile.name, projectProductProfileId: profile.id }, workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok", recentCreativeHistory: [] };
const base = { id: "A", targetAudience: "通勤用户", useMoment: "地铁通勤", coreMotivation: "保护隐私", coreTension: "侧面视线干扰", creativeAngle: "正侧视角观察", contentMechanism: "同一屏幕切换观察角度", hookLine: "侧面还能看清吗？", openingVisual: { subject: "手机", setup: "地铁座位", action: "从正面转到侧面", visibleChangeOrQuestion: "屏幕内容逐渐不可见" }, rationale: "基于事实边界的可拍方向" };
const payload = (items) => JSON.stringify({ directions: items });
const response = (content) => ({ content, providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: 1 });

test("high-risk compliance rule identity and canonical path are diagnostic only", () => {
  const before = compliance.checkCompliance("这是绝对防摔产品").map(({ category, riskType, level, term }) => ({ category, riskType, level, term }));
  const hits = compliance.checkCompliance("这是绝对防摔产品").filter((hit) => hit.level === "高");
  assert.deepEqual(before, hits.map(({ category, riskType, level, term }) => ({ category, riskType, level, term })));
  assert.ok(hits.some((hit) => hit.ruleFamily === "absolute_claim" && hit.ruleCode === "absolute_claim_expression"));
  assert.ok(hits.some((hit) => hit.ruleFamily === "exaggerated_protection" && hit.ruleCode === "exaggerated_protection_expression"));
  const issues = directions.validateCreativeDirection({ ...base, hookLine: "这是绝对防摔产品" }, input);
  assert.ok(issues.some((issue) => issue.type === "compliance" && issue.ruleFamily === "absolute_claim" && issue.ruleCode === "absolute_claim_expression" && issue.diagnosticPath === "hookLine"));
});

test("every existing high-risk family exposes its stable rule code without changing matches", () => {
  const cases = [
    ["绝对", "absolute_claim", "absolute_claim_expression"],
    ["医生推荐", "false_endorsement", "false_endorsement_expression"],
    ["永不碎", "exaggerated_protection", "exaggerated_protection_expression"],
    ["治疗", "medical_claim", "medical_claim_expression"],
  ];
  for (const [text, family, code] of cases) {
    const hit = compliance.checkCompliance(text).find((item) => item.ruleFamily === family);
    assert.equal(hit?.ruleCode, code);
  }
});

test("truth diagnostics expose stable fact and measured identities with exact paths", () => {
  const fact = directions.validateCreativeDirection({ ...base, hookLine: "现在只要€9" }, input);
  assert.ok(fact.some((issue) => issue.type === "truth" && issue.ruleFamily === "commercial_claim" && issue.ruleCode === "unsupported_price" && issue.diagnosticPath === "hookLine"));
  const measured = directions.validateCreativeDirection({ ...base, openingVisual: { ...base.openingVisual, action: "17秒完成安装" } }, input);
  assert.ok(measured.some((issue) => issue.type === "truth" && issue.ruleFamily === "measured_claim" && issue.ruleCode === "unsupported_duration_measurement" && issue.diagnosticPath === "openingVisual.action"));
});

test("grounding and history metadata remain safe and field-specific", () => {
  const grounded = directions.validateCreativeDirection({ ...base, creativeAngle: "贴膜后摔落屏幕完好无损" }, input);
  assert.ok(grounded.some((issue) => issue.type === "grounding" && issue.ruleFamily === "product_claim_grounding" && issue.ruleCode === "unsupported_product_result" && issue.path === "creativeAngle"));
  const historyInput = { ...input, recentCreativeHistory: [{ title: "旧", hook: base.hookLine, creativeAngle: "别的角度", proofMechanism: "别的机制" }] };
  const history = directions.validateCreativeDirection(base, historyInput);
  assert.ok(history.some((issue) => issue.type === "history" && issue.ruleFamily === "history_repetition" && issue.ruleCode === "duplicate_recent_hook" && issue.diagnosticPath === "hookLine"));
});

test("attempt and repair propagation diagnostics retain distinct rules without changing bounded repair", async () => {
  const invalid = { ...base, hookLine: "这是绝对防摔产品，17秒完成安装" };
  const attempts = [];
  const repairs = [];
  let calls = 0;
  const result = await directions.generateCreativeDirections(input, async () => { calls++; return response(payload([invalid])); }, { observe: (value) => attempts.push(value), observeRepair: (value) => repairs.push(value) });
  assert.equal(calls, 2);
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(result.metadata.errorType, "insufficient_candidates");
  assert.equal(attempts.length, 2);
  const diagnosticIssues = attempts[0].candidates.flatMap((candidate) => candidate.issues);
  assert.ok(diagnosticIssues.some((issue) => issue.ruleCode === "absolute_claim_expression"));
  assert.ok(diagnosticIssues.some((issue) => issue.ruleCode === "exaggerated_protection_expression"));
  assert.ok(diagnosticIssues.some((issue) => issue.ruleCode === "unsupported_duration_measurement"));
  assert.equal(repairs.length, 1);
  assert.ok(repairs[0].issues.some((issue) => issue.ruleCode === "absolute_claim_expression" && issue.path === "hookLine" && issue.repairReceived === false));
  assert.ok(repairs[0].issues.every((issue) => !issue.receivedFields.includes("ruleFamily") && !issue.receivedFields.includes("ruleCode")));
  const serialized = JSON.stringify({ attempts, repairs });
  for (const unsafe of [invalid.hookLine, profile.name, profile.sellingPoints, "绝对防摔产品"]) assert.doesNotMatch(serialized, new RegExp(unsafe));
});

test("new rule metadata is not injected into the existing repair prompt", () => {
  const repair = { preserved: [], correctionCandidates: [], missingCount: 3, issues: [{ candidateId: "A", type: "compliance", ruleFamily: "absolute_claim", ruleCode: "absolute_claim_expression", path: "hookLine", message: "绝对化承诺:绝对" }] };
  const prompt = directions.creativeDirectionMessages(input, repair)[0].content;
  assert.doesNotMatch(prompt, /ruleFamily|ruleCode/);
  assert.match(prompt, /"type":"compliance"/);
});
