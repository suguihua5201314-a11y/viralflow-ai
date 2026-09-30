import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { readFile } from "node:fs/promises";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const grounding = await jiti.import("../app/product-claim-grounding.ts");
const productApi = await jiti.import("../app/product-context.ts");
const fixture = await jiti.import("../app/creative-brain-acceptance-fixture.ts");
const runtime = await jiti.import("../app/creative-directions.ts");

const profile = fixture.CREATIVE_BRAIN_ACCEPTANCE_PROFILE;
const context = fixture.CREATIVE_BRAIN_ACCEPTANCE_CONTEXT;
const direction = (id, patch = {}) => ({
  id, targetAudience: "重视隐私的手机用户", useMoment: "通勤途中", coreMotivation: "保护屏幕隐私",
  coreTension: "旁人可能看见屏幕", creativeAngle: "侧看与正看的视角反差", contentMechanism: "切换观察角度",
  hookLine: "旁边的人能看见你的屏幕吗？", openingVisual: { subject: "一部手机", setup: "地铁座位", action: "镜头从正面移动到侧面", visibleChangeOrQuestion: "侧面内容变得难以辨认" },
  rationale: "用可观察场景说明防窥效果", ...patch,
});

test("Preview acceptance fixture binds exact canonical identity and facts", () => {
  assert.equal(context.productName, "变形金刚保护膜");
  assert.equal(context.profileId, profile.id);
  assert.match(context.productKnowledge.sellingPoints, /安装器辅助对位/);
  assert.doesNotMatch(context.productKnowledge.sellingPoints, /抗摔|抗冲击/);
  assert.equal(fixture.validateCreativeBrainAcceptanceBinding({ projectProductName: profile.name, projectProductProfileId: profile.id, productContext: context, productContextFingerprint: fixture.CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT }), true);
  assert.equal(fixture.validateCreativeBrainAcceptanceBinding({ projectProductName: "CrystalArmor 钢化膜", projectProductProfileId: profile.id, productContext: context, productContextFingerprint: fixture.CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT }), false);
});

test("grounded resolver rejects stale, missing, and mixed product identities", () => {
  assert.ok(productApi.resolveGroundedCanonicalProductContext({ productName: profile.name, selectedProductId: profile.id, projectProductProfileId: profile.id, profiles: [profile] }).context);
  assert.ok(productApi.resolveGroundedCanonicalProductContext({ productName: profile.name, selectedProductId: 999, projectProductProfileId: profile.id, profiles: [profile] }).issues.some(item => item.code === "missing_selected_product_profile"));
  assert.ok(productApi.resolveGroundedCanonicalProductContext({ productName: "CrystalArmor 钢化膜", selectedProductId: profile.id, projectProductProfileId: profile.id, profiles: [profile] }).issues.some(item => item.code === "product_identity_mismatch"));
  assert.ok(productApi.resolveGroundedCanonicalProductContext({ productName: "Unknown", profiles: [profile] }).issues.some(item => item.code === "missing_product_truth"));
});

test("Creative Brain route rejects ungrounded input before provider resolution", async () => {
  const route = await jiti.import("../app/api/creative-brain/route.ts");
  const response = await route.POST(new Request("http://localhost/api/creative-brain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: "p", productContext: { productName: "Only a name", profileId: null }, productContextFingerprint: "wrong", market: "Spain", language: "Spanish", platform: "TikTok" }) }));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error.type, "invalid_input");
  assert.ok(data.issues.some(item => item.code === "missing_product_truth"));
});

test("scenario and non-literal metaphor remain creative freedom", () => {
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("A", { openingVisual: { subject: "手机", setup: "走路时", action: "手机从手中滑落", visibleChangeOrQuestion: "裂纹像闪电一样铺满转场画面" } }), context), []);
});

test("unsupported product capability and result are independently rejected", () => {
  const result = grounding.validateCreativeDirectionProductGrounding(direction("A", { hookLine: "贴膜后手机摔落，屏幕完好无损" }), context);
  assert.ok(result.some(item => item.code === "unsupported_product_result" && item.capabilityFamily === "impact_protection"));
  assert.ok(grounding.validateCreativeDirectionProductGrounding(direction("B", { creativeAngle: "隐形但强大的保护力" }), context).some(item => item.code === "unsupported_product_result" || item.code === "unsupported_product_capability"));
  assert.ok(grounding.validateCreativeDirectionProductGrounding(direction("C", { hookLine: "这层膜能减少强光反射" }), context).some(item => item.capabilityFamily === "reflection_reduction"));
});

test("supported qualitative truths pass without verbatim truth matching", () => {
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("A"), context), []);
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("B", { hookLine: "安装器帮助你把膜贴齐", contentMechanism: "展示对位辅助过程" }), context), []);
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("C", { hookLine: "擦净后再滑，日常触控依然流畅", contentMechanism: "观察疏油表面与顺滑滑动" }), context), []);
});

test("scope, numeric, and compliance validators remain separate", () => {
  assert.ok(grounding.validateCreativeDirectionProductGrounding(direction("A", { hookLine: "任何侧面角度都能防窥" }), context).some(item => item.code === "claim_exceeds_supported_scope"));
  const input = { projectId: "p", productContext: context, productContextFingerprint: fixture.CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT, productBinding: { projectProductName: profile.name, projectProductProfileId: profile.id }, market: "Spain", language: "Spanish", platform: "TikTok" };
  assert.ok(runtime.validateCreativeDirection(direction("N", { hookLine: "保证17秒完成安装" }), input).some(item => item.type === "truth"));
  assert.ok(runtime.validateCreativeDirection(direction("C", { hookLine: "100%防爆" }), input).some(item => item.type === "compliance"));
  assert.ok(grounding.validateCreativeDirectionProductGrounding(direction("S"), context).every(item => item.path !== "riskBoundaries"));
});

test("claim scope separates scenario time from unsupported product duration", () => {
  assert.equal(grounding.classifyCreativeClaimScope("今天使用这个产品去上班"), "scenario");
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("S", { useMoment: "今天使用这个产品去上班" }), context), []);
  const duration = grounding.validateCreativeDirectionProductGrounding(direction("D", { hookLine: "产品效果保持一整天" }), context);
  assert.ok(duration.some(item => item.code === "unsupported_duration_claim" && item.path === "hookLine"));
});

test("supported capability does not authorize amplified observable results", () => {
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("W", {
    contentMechanism: "并排展示水滴接触表面的过程并观察变化",
    openingVisual: { subject: "产品表面与水滴", setup: "固定光线下的近景", action: "让水滴接触表面", visibleChangeOrQuestion: "观察水滴在表面的行为" },
  }), context), []);
  const amplified = grounding.validateCreativeDirectionProductGrounding(direction("R", { hookLine: "使用后表面不留任何痕迹" }), context);
  assert.ok(amplified.some(item => item.code === "unsupported_product_result"));
});

test("creative comparison mechanism passes but unsupported comparative facts fail", () => {
  assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("M", { contentMechanism: "把两个画面并排做 A/B 观察演示" }), context), []);
  const unsupported = grounding.validateCreativeDirectionProductGrounding(direction("C", { creativeAngle: "普通产品的水滴散开，而本产品的水滴快速滑落" }), context);
  assert.ok(unsupported.some(item => item.code === "unsupported_comparative_claim" && item.path === "creativeAngle"));
  const comparativeContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: profile.id, profiles: [{ ...profile, sellingPoints: `${profile.sellingPoints}；相比普通产品，水滴更容易滑落` }] });
  assert.equal(grounding.validateCreativeDirectionProductGrounding(direction("T", { creativeAngle: "相比普通产品，本产品水滴更容易滑落" }), comparativeContext).some(item => item.code === "unsupported_comparative_claim"), false);
});

test("grounding repair preserves candidate ID and receives safe issue coordinates", async () => {
  const input = { projectId: "p", productContext: context, productContextFingerprint: fixture.CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT, productBinding: { projectProductName: profile.name, projectProductProfileId: profile.id }, market: "Spain", language: "Spanish", platform: "TikTok" };
  const validB = direction("B", { targetAudience: "首次贴膜用户", useMoment: "在家安装", creativeAngle: "一次对位", contentMechanism: "安装步骤", hookLine: "安装器如何帮助贴齐？", openingVisual: { subject: "安装器", setup: "桌面", action: "辅助对准屏幕", visibleChangeOrQuestion: "边缘对齐" } });
  const validC = direction("C", { targetAudience: "高频手机用户", useMoment: "一天结束", creativeAngle: "滑动体验", contentMechanism: "擦拭后滑动", hookLine: "今天滑了多少次？", openingVisual: { subject: "手指", setup: "窗边", action: "擦拭后滑动", visibleChangeOrQuestion: "滑动保持顺畅" } });
  const calls = [];
  const result = await runtime.generateCreativeDirections(input, async request => {
    calls.push(request);
    return { content: JSON.stringify({ directions: calls.length === 1 ? [direction("A", { hookLine: "贴膜后摔落，屏幕完好无损" }), validB, validC] : [direction("A")] }), providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: 1 };
  });
  assert.equal(calls.length, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map(item => item.id), ["B", "C", "A"]);
  assert.match(calls[1].messages[0].content, /unsupported_product_result/);
  assert.match(calls[1].messages[0].content, /impact_protection/);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("second unsupported repair is explicit failure/partial with no fake direction", async () => {
  const input = { projectId: "p", productContext: context, productContextFingerprint: fixture.CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT, productBinding: { projectProductName: profile.name, projectProductProfileId: profile.id }, market: "Spain", language: "Spanish", platform: "TikTok" };
  let calls = 0;
  const bad = direction("A", { hookLine: "贴膜后摔落，屏幕完好无损" });
  const result = await runtime.generateCreativeDirections(input, async () => ({ content: JSON.stringify({ directions: [bad] }), providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: ++calls }));
  assert.equal(calls, 2);
  assert.notEqual(result.status, "success");
  assert.deepEqual(result.directions, []);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("five product categories use the same grounding contract without category mappings", async () => {
  const cases = [
    ["Screen Protector", "privacy viewing", { hookLine: "侧面视角更难看清屏幕" }],
    ["Probiotic Toothpaste", "supports oral health", { hookLine: "用这款牙膏关注日常口腔健康" }],
    ["Mascara", "lengthening lashes", { hookLine: "刷后呈现纤长睫毛" }],
    ["Moisturizing Stick", "moisturizing skin", { hookLine: "涂后为皮肤补充滋润" }],
    ["Electric Toothbrush", "sonic vibration cleaning mode", { hookLine: "牙刷使用声波震动清洁模式" }],
  ];
  for (const [name, sellingPoints, patch] of cases) {
    const productContext = productApi.resolveCanonicalProductContext({ productName: name, selectedProductId: 1, profiles: [{ ...profile, id: 1, name, sellingPoints, parameters: "", notes: "" }] });
    assert.deepEqual(grounding.validateCreativeDirectionProductGrounding(direction("A", { ...patch, creativeAngle: "围绕已知事实展开", contentMechanism: "展示日常使用过程", openingVisual: { subject: "产品", setup: "日常环境", action: "开始使用", visibleChangeOrQuestion: "观察使用过程" }, rationale: "基于已有事实的表达" }), productContext), []);
  }
  const source = await readFile(new URL("../app/product-claim-grounding.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /category\s*===|switch\s*\(.*category/);
});

test("Preview fixture path ignores localStorage product profiles by construction", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /creativeBrainAcceptanceProjectId===projectMemory\.workspace\.currentProjectId\)return CREATIVE_BRAIN_ACCEPTANCE_CONTEXT/);
  assert.match(page, /validateCreativeBrainAcceptanceBinding/);
});
