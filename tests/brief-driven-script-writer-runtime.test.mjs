import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/brief-driven-script-writer.ts");
const foundation = await jiti.import("../app/brief-driven-script.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const route = await jiti.import("../app/api/script-writer/route.ts");

function context(name = "CrystalArmor", extra = {}) {
  return { productName: name, profileId: null, productKnowledge: { name, brand: "Example Brand", category: "consumer product", sellingPoints: "alignment applicator", parameters: "", bannedWords: "unbreakable", markets: "Spain", notes: "Do not promise guaranteed results", ...extra } };
}

function brief(productContext = context(), overrides = {}) {
  const fingerprint = selection.productContextFingerprint(productContext);
  return {
    schemaVersion: 2,
    id: "creative-brief-a",
    revisionId: "creative-brief-revision-a",
    projectId: "project-a",
    opportunityReference: { canonicalOpportunityId: "opportunity-a", sourceCandidateId: "candidate-a" },
    productReference: { productName: productContext.productName, contextFingerprint: fingerprint },
    sources: { recentScriptRevisionIds: [] },
    opportunity: { targetAudience: "commuters", useMoment: "on a train", purchaseMotivation: "easier daily use", tensionOrObjection: "the usual process feels awkward", creativeOpportunity: "make the everyday change visible" },
    direction: { contentMechanisms: ["continuous observation"], creativeAngle: "show one ordinary use from two viewpoints", creatorPersona: "commuter", contentFormat: "UGC diary", spokenTone: "curious" },
    opening: { hookMechanism: "visual question", hookLine: "What changes when the viewpoint moves?", visual: { subject: "the product", setup: "an everyday commute", action: "the viewpoint shifts", visibleChangeOrQuestion: "the viewer notices a change" } },
    truth: { primaryProductTruth: "alignment applicator", secondaryProductTruths: [] },
    evidence: { type: "routine-context", objective: "show ordinary use", visualEvidence: ["one continuous observation"], limitations: ["do not overstate the result"] },
    ctaDirection: "invite viewers to check compatibility",
    riskBoundaries: { prohibitedClaims: ["unbreakable", "100% guaranteed"], requiredQualifiers: ["results depend on use"], safetyConstraints: ["do not promise guaranteed results"] },
    createdAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  };
}

function input(overrides = {}) {
  const productContext = overrides.productContext || context();
  const creativeBrief = overrides.creativeBrief || brief(productContext);
  return {
    projectId: "project-a",
    requestId: "request-a",
    creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId },
    creativeBrief,
    productContext,
    productContextFingerprint: selection.productContextFingerprint(productContext),
    platform: "TikTok",
    market: "Spain",
    languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" },
    language: "Spanish",
    preferences: { durationSeconds: 20, creatorStyle: "UGC", spokenDensity: "balanced", toneSteering: "natural", variantCount: 1 },
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    title: "邻座视角观察",
    hook: { line: "手机转向侧面时，画面会有什么变化？", openingVisualExecution: "同一部手机从正面缓慢转到侧面。" },
    scenes: [
      { id: "hook", purpose: "hook", visual: "通勤座位上的手机占满首帧。", action: "保持环境不变，将视角从正面移向侧面。", dialogue: "手机转向侧面时，画面会有什么变化？", evidenceRole: "建立视觉问题", durationHint: 3, briefTrace: { executesOpeningVisual: true } },
      { id: "context", purpose: "context", visual: "手机旁边坐着一位通勤乘客。", action: "保持手机位置不变。", dialogue: "这是邻座在日常通勤中的观看角度。", evidenceRole: "交代使用场景", durationHint: 4 },
      { id: "product", purpose: "product", visual: "手机与对位安装器同时出现。", action: "用对位安装器完成一次清晰操作。", dialogue: "对位安装器可以辅助安装。", evidenceRole: "连接产品事实", durationHint: 4 },
      { id: "evidence", purpose: "evidence", visual: "同一镜头连续展示正面和侧面视角。", action: "在相同光线下对比两个位置。", dialogue: "随着观看角度变化，观察屏幕可见范围。", durationHint: 5, evidenceRole: "日常场景观察", briefTrace: { executesEvidence: true } },
      { id: "cta", purpose: "cta", visual: "手机型号与包装信息同时出现。", action: "指向适配型号信息。", dialogue: "可以先确认适合自己手机的型号。", evidenceRole: "承接行动方向", durationHint: 4, briefTrace: { executesCTA: true } },
    ],
    fullNarration: "手机转向侧面时，画面会有什么变化？这是邻座在日常通勤中的观看角度。对位安装器可以辅助安装。随着观看角度变化，观察屏幕可见范围。可以先确认适合自己手机的型号。",
    cta: "可以先确认适合自己手机的型号。",
    workspaceLanguage: "zh-CN",
    targetLanguage: "Spanish",
    localizationStatus: "source",
    totalDurationHint: 20,
    ...overrides,
  };
}

const response = (value, metadata = {}) => ({ content: typeof value === "string" ? value : JSON.stringify(value), providerRequested: "deepseek", providerUsed: "deepseek", model: "configured-model", responseTimeMs: 25, ...metadata });

test("valid input reaches the mock Provider and returns a bound StructuredScript", async () => {
  let calls = 0;
  const result = await runtime.generateBriefDrivenScript(input(), async () => { calls += 1; return response(draft()); });
  assert.equal(calls, 1);
  assert.equal(result.status, "success");
  assert.equal(result.script.sourceCreativeBriefId, "creative-brief-a");
  assert.equal(result.script.sourceCreativeBriefRevisionId, "creative-brief-revision-a");
  assert.match(result.script.revisionId, /^script-revision-/);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("Spanish, English and French targets all produce the same Chinese source contract", async () => {
  for (const targetLanguage of ["Spanish", "English", "French"]) {
    const languageContext = { workspaceLanguage: "zh-CN", targetLanguage, market: "Spain", platform: "TikTok" };
    const result = await runtime.generateBriefDrivenScript(input({ languageContext }), async () => response(draft({ targetLanguage })));
    assert.equal(result.status, "success", targetLanguage);
    assert.equal(result.draft.workspaceLanguage, "zh-CN");
    assert.equal(result.draft.localizationStatus, "source");
    assert.equal(result.script.language, "zh-CN");
  }
});

test("foreign Project, wrong Brief revision and Product fingerprint stop before Provider", async () => {
  for (const invalid of [
    input({ projectId: "project-b" }),
    input({ creativeBriefReference: { id: "creative-brief-a", revisionId: "wrong" } }),
    input({ productContextFingerprint: "wrong" }),
  ]) {
    let calls = 0;
    const result = await runtime.generateBriefDrivenScript(invalid, async () => { calls += 1; return response(draft()); });
    assert.equal(result.status, "failure");
    assert.equal(result.metadata.errorType, "invalid_input");
    assert.equal(calls, 0);
  }
});

test("market, language, platform and expression preferences are validated before Provider", async () => {
  const invalid = input({ market: "France", languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "", market: "", platform: "" }, preferences: { durationSeconds: 500, spokenDensity: "extreme", variantCount: 2 } });
  let calls = 0;
  const result = await runtime.generateBriefDrivenScript(invalid, async () => { calls += 1; return response(draft()); });
  assert.equal(calls, 0);
  for (const code of ["market_mismatch", "missing_target_language", "missing_platform", "invalid_duration_preference", "invalid_variant_count", "invalid_spoken_density"]) assert.ok(result.issues.some((item) => item.code === code), code);
});

test("prompt has layered locked Brief, canonical truth, preferences and output contract", () => {
  const messages = runtime.buildBriefDrivenWriterMessages(input());
  const payload = JSON.parse(messages[1].content);
  assert.equal(payload.lockedCreativeBrief.creativeAngle, brief().direction.creativeAngle);
  assert.equal(payload.lockedCreativeBrief.hookMechanism, brief().opening.hookMechanism);
  assert.equal(payload.canonicalProductTruth.productName, "CrystalArmor");
  assert.deepEqual(payload.canonicalProductTruth.sellingPoints, ["alignment applicator"]);
  assert.equal(payload.expressionPreferences.spokenDensity, "balanced");
  assert.match(payload.qualityBar.hook, /concrete spoken observation/);
  assert.match(payload.qualityBar.spokenLanguage, /brochure language/);
  assert.match(payload.qualityBar.evidence, /must not upgrade/);
  assert.match(payload.qualityBar.cta, /Avoid abrupt sales pressure/);
  assert.equal(payload.outputContract.scenes[0].purpose, "hook | context | product | evidence | cta");
  assert.match(messages[0].content, /creative strategy has already been decided/i);
  assert.doesNotMatch(messages.map((item) => item.content).join("\n"), /buildCreativeConcepts|QualityCreativeConcept|choose (?:a |the )?creative angle|choose (?:an |the )?evidence strategy|choose (?:a |the )?CTA strategy/i);
});

test("representative Writer prompt stays bounded and does not duplicate the Brief or Product Truth", () => {
  const messages = runtime.buildBriefDrivenWriterMessages(input());
  const total = messages.reduce((sum, item) => sum + item.content.length, 0);
  assert.ok(messages[0].content.length < 1_500, messages[0].content.length);
  assert.ok(messages[1].content.length < 6_000, messages[1].content.length);
  assert.ok(total < 7_000, total);
  assert.equal((messages[1].content.match(/lockedCreativeBrief/g) || []).length, 1);
  assert.equal((messages[1].content.match(/canonicalProductTruth/g) || []).length, 1);
});

test("valid fenced JSON is accepted without normalizing invalid output", async () => {
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(`\`\`\`json\n${JSON.stringify(draft())}\n\`\`\``));
  assert.equal(result.status, "success");
  assert.deepEqual(result.draft, draft());
});

test("new Writer output rejects the ambiguous legacy language field", async () => {
  const result = await runtime.generateBriefDrivenScript(input(), async () => response({ ...draft(), language: "Spanish" }));
  assert.equal(result.status, "failure");
  assert.ok(result.issues.some((item) => item.code === "unexpected_legacy_language" && item.path === "language"));
});

test("malformed JSON repairs once with structured code and path context", async () => {
  const requests = [];
  const result = await runtime.generateBriefDrivenScript(input(), async (request) => {
    requests.push(request);
    return requests.length === 1 ? response("not-json") : response(draft());
  });
  assert.equal(result.status, "success");
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(repair.issues[0], { code: "invalid_json", stage: "draft_parse" });
});

test("missing trace, invalid purpose and language mismatch share one constrained repair policy", async () => {
  for (const broken of [
    (() => { const value = draft(); delete value.scenes[0].briefTrace; return value; })(),
    (() => { const value = draft(); value.scenes[1].purpose = "director"; return value; })(),
    draft({ workspaceLanguage: "en-US" }),
  ]) {
    let calls = 0;
    const result = await runtime.generateBriefDrivenScript(input(), async () => { calls += 1; return response(calls === 1 ? broken : draft()); });
    assert.equal(result.status, "success");
    assert.equal(result.metadata.repairAttempted, true);
    assert.equal(calls, 2);
  }
});

test("wrong source language receives one constrained repair and remains explicit when repair is still wrong", async () => {
  const wrongLanguage = draft({ title: "English title", hook: { line: "English hook", openingVisualExecution: "English visual" } });
  const requests = [];
  const repaired = await runtime.generateBriefDrivenScript(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? wrongLanguage : draft());
  });
  assert.equal(repaired.status, "success");
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.ok(repair.issues.some((item) => item.code === "internal_language_mismatch"));
  assert.match(repair.instruction, /Simplified Chinese/);

  let calls = 0;
  const failed = await runtime.generateBriefDrivenScript(input(), async () => { calls += 1; return response(wrongLanguage); });
  assert.equal(calls, 2);
  assert.equal(failed.status, "failure");
  assert.equal(failed.metadata.errorType, "repair_failed");
  assert.ok(failed.issues.some((item) => item.code === "internal_language_mismatch"));
});

test("claim-safety failures receive at most one constrained repair", async () => {
  for (const unsafe of [
    draft({ cta: "This is unbreakable." }),
    draft({ cta: "This is officially approved." }),
    draft({ cta: "Get 99% guaranteed protection." }),
  ]) {
    const requests = [];
    const result = await runtime.generateBriefDrivenScript(input(), async (request) => { requests.push(request); return response(requests.length === 1 ? unsafe : draft()); });
    assert.equal(result.status, "success");
    assert.equal(requests.length, 2);
    const repairIssues = JSON.parse(requests[1].messages[1].content).repair.issues;
    assert.ok(repairIssues.every((item) => item.code && item.path && item.stage));
  }
});

test("Brief safety metadata is not treated as consumer-facing content", async () => {
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(draft()));
  assert.equal(result.status, "success");
  assert.equal(result.metadata.repairAttempted, false);
});

test("repair keeps the same locked Brief and cannot return replacement strategy fields", async () => {
  const requests = [];
  const replacement = { ...draft(), creativeAngle: "a different direction" };
  const result = await runtime.generateBriefDrivenScript(input(), async (request) => { requests.push(request); return response(requests.length === 1 ? "not-json" : replacement); });
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "repair_failed");
  assert.equal(requests.length, 2);
  const initial = JSON.parse(requests[0].messages[1].content).lockedCreativeBrief;
  const repaired = JSON.parse(requests[1].messages[1].content).lockedCreativeBrief;
  assert.deepEqual(repaired, initial);
  assert.ok(result.issues.some((item) => item.path === "creativeAngle" && item.code === "unexpected_field"));
});

test("a second invalid response is explicit failure with no legacy/local fallback", async () => {
  let calls = 0;
  const result = await runtime.generateBriefDrivenScript(input(), async () => { calls += 1; return response("invalid"); });
  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.script, null);
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(result.metadata.fallbackUsed, false);
  assert.equal(result.metadata.errorType, "repair_failed");
});

test("Provider transport failure is explicit and never triggers repair", async () => {
  let calls = 0;
  const events = [];
  const result = await runtime.generateBriefDrivenScript(input(), async () => { calls += 1; throw { category: "timeout" }; }, { observe: (event) => events.push(event) });
  assert.equal(calls, 1);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "timeout");
  assert.equal(result.metadata.repairAttempted, false);
  assert.equal(result.metadata.fallbackUsed, false);
  assert.equal(events.at(-1).stage, "provider_transport");
});

test("observability distinguishes provider HTTP and provider response parsing failures", async () => {
  for (const [category, expectedStage] of [["unauthorized", "provider_http"], ["json_parse_error", "provider_parse"]]) {
    const events = [];
    const result = await runtime.generateBriefDrivenScript(input(), async () => { throw { category }; }, { observe: (event) => events.push(event) });
    assert.equal(result.status, "failure");
    assert.equal(result.metadata.errorType, category);
    assert.equal(events.at(-1).stage, expectedStage);
  }
});

test("metadata preserves provider identity, model and accumulated repair latency", async () => {
  let calls = 0;
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(++calls === 1 ? "invalid" : draft(), { providerRequested: "doubao", providerUsed: "deepseek", model: "safe-model", responseTimeMs: 30 }));
  assert.deepEqual(result.metadata, { providerRequested: "doubao", providerUsed: "deepseek", model: "safe-model", latencyMs: 60, repairAttempted: true, fallbackUsed: false, errorType: null });
});

test("adapter output remains Director-compatible and uses trusted Brief/Product lineage", async () => {
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(draft()));
  assert.equal(result.script.product, "CrystalArmor");
  assert.equal(result.script.creativeAngle, brief().direction.creativeAngle);
  assert.equal(result.script.narration, draft().fullNarration);
  assert.equal(result.script.scenes.length, 5);
  assert.deepEqual(Object.keys(result.script.scenes[0]).sort(), ["edit", "line", "time", "visual"]);
  assert.equal(result.script.sourceCreativeBriefId, brief().id);
  assert.equal(result.script.sourceCreativeBriefRevisionId, brief().revisionId);
});

const categories = ["Screen Protector", "Probiotic Toothpaste", "Mascara", "Moisturizing Stick", "Electric Toothbrush"];
test("five categories use the same runtime, prompt, parser and deterministic validation", async () => {
  for (const name of categories) {
    const productContext = context(name, { markets: "Spain" });
    const creativeBrief = brief(productContext, {
      id: `brief-${name}`,
      revisionId: `revision-${name}`,
      direction: { ...brief(productContext).direction, creativeAngle: `fixture direction for ${name}`, contentMechanisms: [`fixture mechanism for ${name}`] },
    });
    const value = input({ productContext, creativeBrief, creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId }, productContextFingerprint: selection.productContextFingerprint(productContext) });
    const result = await runtime.generateBriefDrivenScript(value, async () => response(draft()));
    assert.equal(result.status, "success", name);
    assert.equal(result.script.creativeAngle, creativeBrief.direction.creativeAngle);
  }
});

test("production runtime contains no category mappings, legacy engine, persistence or Critic runtime", async () => {
  const source = await readFile(new URL("../app/brief-driven-script-writer.ts", import.meta.url), "utf8");
  for (const name of categories) assert.equal(source.includes(name), false, name);
  assert.doesNotMatch(source, /buildCreativeConcepts|runScriptQualityEngine|mutateProjectMemory|scriptVersions|selectedScriptRevisionId|CriticResult|TargetedRewrite/);
  assert.doesNotMatch(source, /category\s*===|switch\s*\(\s*category\s*\)/i);
});

test("safe observations expose identity, stages and issue metadata without content", async () => {
  const events = [];
  await runtime.generateBriefDrivenScript(input(), async () => response("invalid"), { correlationId: "correlation-a", observe: (event) => events.push(event) });
  assert.equal(events.every((event) => event.correlationId === "correlation-a"), true);
  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /alignment applicator|What changes when|Creative Brief正文|unbreakable/);
  assert.ok(events.some((event) => event.stage === "draft_json_parse" && event.issues[0].code === "invalid_json"));
});

test("Writer truth diagnostics compare initial and repair failures by safe rule family", async () => {
  const unsafe = draft({ cta: "这是平台认证产品。" });
  let calls = 0;
  const events = [];
  const result = await runtime.generateBriefDrivenScript(input(), async () => {
    calls += 1;
    return response(unsafe);
  }, { correlationId: "writer-truth-correlation", observe: (event) => events.push(event) });

  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "repair_failed");
  assert.deepEqual(result.validationDiagnostics?.map(({ attempt, stage, issueCode, path, ruleFamily, ruleCode }) => ({ attempt, stage, issueCode, path, ruleFamily, ruleCode })), [
    { attempt: 0, stage: "truth", issueCode: "unsupported_product_truth", path: "cta", ruleFamily: "certification_or_endorsement", ruleCode: "unsupported_certification_or_endorsement" },
    { attempt: 1, stage: "truth", issueCode: "unsupported_product_truth", path: "cta", ruleFamily: "certification_or_endorsement", ruleCode: "unsupported_certification_or_endorsement" },
  ]);
  assert.equal(events.every((event) => event.correlationId === "writer-truth-correlation"), true);
  assert.equal(events.at(-1).stage, "repair_failed");
});

test("Writer truth diagnostics preserve multiple deterministic rules on one path", async () => {
  const unsafe = draft({ cta: "这是平台认证产品，现在只要 €19，库存有限。" });
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(unsafe));
  const initial = result.validationDiagnostics?.filter((item) => item.attempt === 0 && item.path === "cta") || [];
  assert.deepEqual(initial.map((item) => item.ruleCode).sort(), [
    "unsupported_certification_or_endorsement",
    "unsupported_inventory_or_ranking",
    "unsupported_price",
  ]);
  assert.equal(result.issues.filter((item) => item.code === "unsupported_product_truth" && item.path === "cta").length, 3);
});

test("Writer truth diagnostics do not alter success or bounded repair success", async () => {
  let successCalls = 0;
  const success = await runtime.generateBriefDrivenScript(input(), async () => { successCalls += 1; return response(draft()); });
  assert.equal(success.status, "success");
  assert.equal(successCalls, 1);
  assert.equal(success.validationDiagnostics, undefined);

  const unsafe = draft({ cta: "这是平台认证产品。" });
  let repairCalls = 0;
  const repaired = await runtime.generateBriefDrivenScript(input(), async () => response(++repairCalls === 1 ? unsafe : draft()));
  assert.equal(repaired.status, "success");
  assert.equal(repairCalls, 2);
  assert.equal(repaired.metadata.repairAttempted, true);
  assert.equal(repaired.validationDiagnostics?.length, 1);
  assert.equal(repaired.validationDiagnostics?.[0].attempt, 0);
});

test("Writer truth diagnostic payload excludes generated and secret content", async () => {
  const secretDialogue = "SENSITIVE-DIALOGUE-DO-NOT-LOG";
  const secretNarration = "SENSITIVE-NARRATION-DO-NOT-LOG";
  const secretCta = "SENSITIVE-CTA-DO-NOT-LOG 平台认证";
  const unsafe = draft({ scenes: draft().scenes.map((scene, index) => index === 4 ? { ...scene, dialogue: secretDialogue } : scene), fullNarration: secretNarration, cta: secretCta });
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(unsafe));
  const payload = JSON.stringify(result.validationDiagnostics);
  assert.doesNotMatch(payload, /SENSITIVE-|CrystalArmor|alignment applicator|lockedCreativeBrief|canonicalProductTruth|Bearer|API[_-]?KEY/i);
  assert.match(payload, /certification_or_endorsement/);
});

test("truth-aware repair receives the canonical unsupported promotion rule and succeeds", async () => {
  const unsafe = draft({ cta: "现在买一送一。" });
  const requests = [];
  const result = await runtime.generateBriefDrivenScript(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? unsafe : draft());
  });
  assert.equal(result.status, "success");
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(repair.issues, [{ code: "unsupported_product_truth", path: "cta", stage: "truth", ruleFamily: "commercial_claim", ruleCode: "unsupported_promotion" }]);
  assert.match(repair.ruleGuidance.join(" "), /discount.*coupon.*bundle promotion.*buy-one-get-one/i);
  assert.match(repair.instruction, /do not relocate, paraphrase, or reintroduce/i);
});

test("truth-aware repair receives the canonical gift and delivery rule and succeeds", async () => {
  const unsafe = draft({ cta: "现在免费赠送礼品。" });
  const requests = [];
  const result = await runtime.generateBriefDrivenScript(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? unsafe : draft());
  });
  assert.equal(result.status, "success");
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(repair.issues, [{ code: "unsupported_product_truth", path: "cta", stage: "truth", ruleFamily: "commercial_claim", ruleCode: "unsupported_gift_or_delivery" }]);
  assert.match(repair.ruleGuidance.join(" "), /gift.*free offer.*free shipping.*delivery promise/i);
});

test("truth-aware repair preserves multiple commercial rule identities on one path", async () => {
  const unsafe = draft({ cta: "现在买一送一，并免费赠送礼品。" });
  const requests = [];
  const result = await runtime.generateBriefDrivenScript(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? unsafe : draft());
  });
  assert.equal(result.status, "success");
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(repair.issues.map((item) => item.ruleCode).sort(), ["unsupported_gift_or_delivery", "unsupported_promotion"]);
  assert.equal(repair.ruleGuidance.length, 2);
});

test("relocating an unsupported promotion fails full validation without another repair", async () => {
  const initial = draft();
  initial.scenes[4].visual = "画面展示买一送一。";
  const relocated = draft();
  relocated.scenes[3].visual = "画面展示买一送一。";
  let calls = 0;
  const result = await runtime.generateBriefDrivenScript(input(), async () => response(++calls === 1 ? initial : relocated));
  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "repair_failed");
  assert.ok(result.issues.some((item) => item.path === "scenes.3.visual" && item.ruleCode === "unsupported_promotion"));
});

test("generic repair issues retain the previous code, path and stage-only contract", () => {
  const repair = JSON.parse(runtime.buildBriefDrivenWriterMessages(input(), [{ code: "missing_field", path: "hook.line", stage: "draft_schema", validator: "parseScriptDraftV2" }])[1].content).repair;
  assert.deepEqual(repair.issues, [{ code: "missing_field", path: "hook.line", stage: "draft_schema" }]);
  assert.equal(repair.ruleGuidance, undefined);
  assert.doesNotMatch(repair.instruction, /do not relocate/i);
});

test("commercial validator characterization records current negation and production-instruction behavior", () => {
  const negated = draft({ cta: "不要承诺买一送一。" });
  const instruction = draft();
  instruction.scenes[4].visual = "画面中不要出现优惠券。";
  const negatedIssue = foundation.validateScriptDraftDeterministically(input(), negated).find((item) => item.path === "cta" && item.ruleCode === "unsupported_promotion");
  const instructionIssue = foundation.validateScriptDraftDeterministically(input(), instruction).find((item) => item.path === "scenes.4.visual" && item.ruleCode === "unsupported_promotion");
  assert.ok(negatedIssue, "current regex treats a negated promotion phrase as a violation");
  assert.ok(instructionIssue, "current regex treats a production instruction as a violation");
});

test("API route rejects incomplete input before any provider fetch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error("must not fetch"); };
  try {
    const responseValue = await route.POST(new Request("http://localhost/api/script-writer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: "project-a" }) }));
    assert.equal(responseValue.status, 400);
    assert.equal(fetchCalls, 0);
    const payload = await responseValue.json();
    assert.equal(payload.error.type, "invalid_input");
  } finally { globalThis.fetch = originalFetch; }
});

test("API route uses purpose-specific routing and returns the runtime contract with a mocked provider", async () => {
  const previousKey = process.env.DEEPSEEK_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.DEEPSEEK_API_KEY = "test-only-key";
  let fetchCalls = 0;
  globalThis.fetch = async (_url, options) => {
    fetchCalls += 1;
    const providerRequest = JSON.parse(options.body);
    assert.equal(providerRequest.messages.length, 2);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft()) }, finish_reason: "stop" }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const responseValue = await route.POST(new Request("http://localhost/api/script-writer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input(), provider: "deepseek" }) }));
    assert.equal(responseValue.status, 201);
    assert.equal(fetchCalls, 1);
    const payload = await responseValue.json();
    assert.equal(payload.status, "success");
    assert.equal(payload.metadata.providerUsed, "deepseek");
    assert.equal(payload.metadata.fallbackUsed, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previousKey;
  }
});

test("Preview provider override affects only the new Script Writer route resolver", () => {
  assert.equal(route.resolveScriptWriterProvider("doubao", "preview", "deepseek"), "deepseek");
  assert.equal(route.resolveScriptWriterProvider("doubao", "production", "deepseek"), "doubao");
  assert.equal(route.resolveScriptWriterProvider("openai", "preview", "invalid"), "openai");
});
