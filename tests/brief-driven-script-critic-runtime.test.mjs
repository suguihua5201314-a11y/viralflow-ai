import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/brief-driven-script-critic.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const route = await jiti.import("../app/api/script-critic/route.ts");

function context(name = "CrystalArmor", category = "consumer product") {
  return { productName: name, profileId: null, productKnowledge: { name, brand: "Example Brand", category, sellingPoints: "alignment applicator", parameters: "", bannedWords: "unbreakable", markets: "Spain", notes: "Do not promise guaranteed results" } };
}

function brief(productContext = context(), overrides = {}) {
  return {
    schemaVersion: 2,
    id: "creative-brief-a",
    revisionId: "creative-brief-revision-a",
    projectId: "project-a",
    opportunityReference: { canonicalOpportunityId: "opportunity-a", sourceCandidateId: "candidate-a" },
    productReference: { productName: productContext.productName, contextFingerprint: selection.productContextFingerprint(productContext) },
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

function input(overrides = {}) {
  const canonicalProductContext = overrides.canonicalProductContext || context();
  const creativeBrief = overrides.creativeBrief || brief(canonicalProductContext);
  return {
    projectId: "project-a",
    requestId: "critic-request-a",
    creativeBriefReference: { briefId: creativeBrief.id, briefRevisionId: creativeBrief.revisionId },
    creativeBrief,
    canonicalProductContext,
    productContextFingerprint: selection.productContextFingerprint(canonicalProductContext),
    scriptDraft: draft(),
    platform: "TikTok",
    market: "Spain",
    languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" },
    language: "Spanish",
    preferences: { creatorStyle: "UGC", durationPreference: 20, spokenDensity: "balanced", tone: "natural" },
    ...overrides,
  };
}

const targetRefFor = (target) => {
  if (typeof target === "string") return target;
  if (target.scope === "title" && target.field === "title") return "TITLE";
  if (target.scope === "hook" && target.field === "line") return "HOOK_LINE";
  if (target.scope === "hook" && target.field === "openingVisualExecution") return "HOOK_OPENING_VISUAL";
  if (target.scope === "narration" && target.field === "fullNarration") return "FULL_NARRATION";
  if (target.scope === "cta" && target.field === "cta") return "CTA";
  if (target.scope === "scene" && target.sceneId && ["visual", "action", "dialogue", "evidenceRole"].includes(target.field)) return `SCENE:${encodeURIComponent(target.sceneId)}:${target.field.toUpperCase()}`;
  return `INVALID:${JSON.stringify(target)}`;
};
const pass = (summary = "脚本忠实执行了选定的创意简报。") => ({ verdict: "pass", issues: [], summary });
const issue = (code, target, overrides = {}) => ({ code, severity: "major", targetRef: targetRefFor(target), message: "当前执行偏离了锁定的创意简报。", rewriteInstruction: "只修正这个局部执行问题，并保留简报决策。", deterministic: false, ...overrides });
const critique = (...issues) => ({ verdict: issues.some((item) => item.severity !== "minor") ? "needs_rewrite" : "pass", issues });
const response = (value, overrides = {}) => ({ content: typeof value === "string" ? value : JSON.stringify(value), providerRequested: "deepseek", providerUsed: "deepseek", model: "configured-model", responseTimeMs: 20, ...overrides });

test("aligned script passes through the production Critic runtime", async () => {
  let calls = 0;
  const result = await runtime.generateScriptCritique(input(), async () => { calls += 1; return response(pass()); });
  assert.equal(calls, 1);
  assert.equal(result.status, "success");
  assert.equal(result.critique.verdict, "pass");
  assert.deepEqual(result.critique.issues, []);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("Critic can diagnose advertising and unnatural UGC dialogue without rewriting", async () => {
  const result = await runtime.generateScriptCritique(input(), async () => response(critique(
    issue("ugc_advertising_tone", { scope: "scene", sceneId: "product", field: "dialogue" }),
    issue("ugc_unnatural_dialogue", { scope: "narration", field: "fullNarration" }, { severity: "minor" }),
  )));
  assert.equal(result.critique.verdict, "needs_rewrite");
  assert.deepEqual(result.critique.issues.map((item) => item.code), ["ugc_advertising_tone", "ugc_unnatural_dialogue"]);
  assert.equal("replacement" in result.critique.issues[0], false);
});

test("matching hook text does not hide opening visual drift", async () => {
  const result = await runtime.generateScriptCritique(input(), async () => response(critique(
    issue("opening_visual_mismatch", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual" }),
  )));
  assert.equal(result.critique.issues[0].code, "opening_visual_mismatch");
});

test("semantic evidence and causal failures use stable codes and existing scene targets", async () => {
  for (const code of ["unsupported_causal_claim", "evidence_dialogue_mismatch", "unobservable_claim"]) {
    const result = await runtime.generateScriptCritique(input(), async () => response(critique(issue(code, { scope: "scene", sceneId: "evidence", field: "dialogue" }, { briefField: "evidence" }))));
    assert.equal(result.status, "success");
    assert.equal(result.critique.issues[0].code, code);
  }
});

test("CTA direction drift remains a semantic Critic issue", async () => {
  const result = await runtime.generateScriptCritique(input(), async () => response(critique(issue("cta_direction_drift", { scope: "cta", field: "cta" }, { briefField: "ctaDirection" }))));
  assert.equal(result.critique.issues[0].code, "cta_direction_drift");
});

test("canonical Brief fields and omitted fields pass while aliases and arbitrary strings fail", () => {
  const canonical = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("brief_angle_drift", { scope: "narration", field: "fullNarration" }, { briefField: "direction.creativeAngle" }))), draft());
  assert.equal(canonical.issues.length, 0);
  const omitted = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("ugc_repetitive", { scope: "narration", field: "fullNarration" }))), draft());
  assert.equal(omitted.issues.length, 0);
  for (const briefField of ["creativeAngle", "creative_angle", "angle", "anything"]) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("brief_angle_drift", { scope: "narration", field: "fullNarration" }, { briefField }))), draft());
    assert.equal(parsed.value, null);
    assert.ok(parsed.issues.some((item) => item.code === "invalid_brief_field" && item.path === "issues.0.briefField"));
  }
});

test("real invalid briefField failure repairs with the shared canonical enum without mutating inputs", async () => {
  const sourceInput = input();
  const before = structuredClone(sourceInput);
  const requests = [];
  const invalid = critique(issue("brief_angle_drift", { scope: "narration", field: "fullNarration" }, { briefField: "creative_angle" }));
  const repaired = critique(issue("brief_angle_drift", { scope: "narration", field: "fullNarration" }, { briefField: "direction.creativeAngle" }));
  const result = await runtime.generateScriptCritique(sourceInput, async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? invalid : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(result.critique.issues[0].briefField, "direction.creativeAngle");
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(requests.length, 2);
  const initialContract = JSON.parse(requests[0].messages[1].content).outputContract.issues[0].briefField;
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(initialContract.allowedValues, runtime.CRITIC_BRIEF_FIELD_VALUES);
  assert.deepEqual(repair.allowedBriefFields, runtime.CRITIC_BRIEF_FIELD_VALUES);
  assert.deepEqual(repair.issues[0], { code: "invalid_brief_field", path: "issues.0.briefField", stage: "critic_schema" });
  assert.match(repair.instruction, /invalid_target_ref/);
  assert.match(repair.instruction, /Preserve issue count, order, code, severity, critique meaning/i);
  assert.deepEqual(sourceInput, before);
});

test("invalid targetRef is rejected and repaired at most once", async () => {
  const requests = [];
  const bad = critique(issue("scene_filler", { scope: "scene", sceneId: "missing", field: "dialogue" }));
  const repaired = critique(issue("scene_filler", { scope: "scene", sceneId: "context", field: "dialogue" }));
  const result = await runtime.generateScriptCritique(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? bad : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.ok(repair.issues.some((item) => item.code === "invalid_target_ref" && item.path === "issues.0.targetRef"));
  assert.equal(repair.issues[0].rejectedTargetRef, "SCENE:missing:DIALOGUE");
  assert.ok(repair.targetCatalog.some((item) => item.targetRef === "SCENE:context:DIALOGUE"));
});

test("canonical target schema accepts and resolves every legal address to one real Draft node", () => {
  const value = draft();
  const catalog = runtime.buildCriticReviewTargetCatalog(value);
  assert.equal(new Set(catalog.map((entry) => entry.targetRef)).size, catalog.length);
  assert.equal(catalog.filter((entry) => entry.target.scope === "scene").length, value.scenes.length * 4);
  for (const entry of catalog) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("scene_filler", entry.targetRef))), value);
    assert.equal(parsed.issues.length, 0, entry.targetRef);
    assert.deepEqual(runtime.resolveCriticTargetRef(value, entry.targetRef), entry.target);
    const resolved = runtime.resolveCriticTarget(value, entry.target);
    assert.ok(resolved, entry.targetRef);
    assert.equal(typeof resolved.value, "string");
    assert.equal(resolved.path, entry.path);
  }
});

test("every canonical Critic issue code is accepted from one shared contract", () => {
  for (const code of runtime.CRITIC_ISSUE_CODE_VALUES) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue(code, "HOOK_LINE"))), draft());
    assert.equal(parsed.issues.length, 0, code);
  }
  for (const code of ["arbitrary_code", "brief_hook_fidelity"]) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue(code, "HOOK_LINE"))), draft());
    assert.equal(parsed.value, null);
    assert.ok(parsed.issues.some(item => item.code === "invalid_issue_code"));
  }
});

test("invalid issue code repair receives safe canonical context and changes only that code", async () => {
  const requests = [];
  const invalid = critique(issue("hook_quality", "HOOK_LINE", { briefField: "opening.hookLine" }));
  const repaired = critique(issue("weak_hook_execution", "HOOK_LINE", { briefField: "opening.hookLine" }));
  const result = await runtime.generateScriptCritique(input(), async request => {
    requests.push(request);
    return response(requests.length === 1 ? invalid : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(result.critique.issues[0].code, "weak_hook_execution");
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.deepEqual(repair.allowedIssueCodes, runtime.CRITIC_ISSUE_CODE_VALUES);
  assert.deepEqual(repair.issues[0], { code: "invalid_issue_code", path: "issues.0.code", stage: "critic_schema", rejectedIssueCode: "hook_quality" });
  assert.deepEqual(repair.originalCritique, invalid);
  assert.match(repair.instruction, /only the code at that exact path/i);
});

test("issue code repair deterministically discards Provider changes to valid fields and critique semantics", async () => {
  const initial = critique(
    issue("hook_quality", "HOOK_LINE", { briefField: "opening.hookLine" }),
    issue("scene_filler", { scope: "scene", sceneId: "context", field: "dialogue" }),
  );
  const changed = critique(
    issue("weak_hook_execution", "HOOK_LINE", { briefField: "opening.hookLine", message: "Provider试图改变原判断。" }),
    issue("scene_redundancy", { scope: "scene", sceneId: "context", field: "dialogue" }),
  );
  let calls = 0;
  const result = await runtime.generateScriptCritique(input(), async () => response(++calls === 1 ? initial : changed));
  assert.equal(result.status, "success");
  assert.equal(calls, 2);
  assert.deepEqual(result.critique.issues.map((item) => item.code), ["weak_hook_execution", "scene_filler"]);
  assert.equal(result.critique.issues[0].message, initial.issues[0].message);
  assert.equal(result.critique.issues[1].message, initial.issues[1].message);
});

test("real eight-code failure repairs atomically without regenerating critique semantics", async () => {
  const invalid = {
    verdict: "needs_rewrite",
    summary: "初次评审摘要。",
    issues: Array.from({ length: 8 }, (_, index) => issue(`provider_alias_${index}`, index % 2 ? "FULL_NARRATION" : "HOOK_LINE")),
  };
  const repaired = {
    verdict: "pass",
    summary: "Provider试图改写摘要。",
    issues: invalid.issues.map((item, index) => ({
      ...item,
      code: runtime.CRITIC_ISSUE_CODE_VALUES[index],
      message: "Provider试图改写评审语义。",
      rewriteInstruction: "Provider试图改写修复要求。",
    })),
  };
  const requests = [];
  const result = await runtime.generateScriptCritique(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? invalid : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(requests.length, 2);
  assert.equal(result.critique.verdict, "needs_rewrite");
  assert.equal(result.critique.summary, invalid.summary);
  assert.deepEqual(result.critique.issues.map((item) => item.code), runtime.CRITIC_ISSUE_CODE_VALUES.slice(0, 8));
  assert.ok(result.critique.issues.every((item) => item.message === invalid.issues[0].message));
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.equal(repair.originalCritique.issues.length, 8);
  assert.equal(repair.issues.length, 8);
  assert.deepEqual(repair.allowedIssueCodes, runtime.CRITIC_ISSUE_CODE_VALUES);
});

test("issue code repair cannot delete an existing issue", async () => {
  const initial = critique(
    issue("hook_quality", "HOOK_LINE", { briefField: "opening.hookLine" }),
    issue("scene_filler", { scope: "scene", sceneId: "context", field: "dialogue" }),
  );
  const deleted = critique(issue("weak_hook_execution", "HOOK_LINE", { briefField: "opening.hookLine" }));
  let calls = 0;
  const result = await runtime.generateScriptCritique(input(), async () => response(++calls === 1 ? initial : deleted));
  assert.equal(result.status, "success");
  assert.deepEqual(result.critique.issues.map((item) => item.code), ["weak_hook_execution", "scene_filler"]);
  assert.equal(result.critique.issues.length, 2);
});

test("invalid issue code is repaired at most once and unsafe rejected values are not echoed", async () => {
  const unsafe = critique(issue("not safe value with user content", "HOOK_LINE"));
  const parsed = runtime.parseScriptCriticResult(JSON.stringify(unsafe), draft());
  assert.equal(parsed.issues[0].rejectedIssueCode, undefined);
  let calls = 0;
  const result = await runtime.generateScriptCritique(input(), async () => response((++calls, unsafe)));
  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "repair_failed");
});

test("wrong Critic review language repairs once without changing critique semantics", async () => {
  const english = critique({ ...issue("weak_hook_execution", "HOOK_LINE", { briefField: "opening.hookLine" }), message: "The hook is weak.", rewriteInstruction: "Strengthen only the hook." });
  const chinese = critique(issue("weak_hook_execution", "HOOK_LINE", { briefField: "opening.hookLine" }));
  const requests = [];
  const result = await runtime.generateScriptCritique(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? english : chinese);
  });
  assert.equal(result.status, "success");
  assert.equal(requests.length, 2);
  const repair = JSON.parse(requests[1].messages[1].content).repair;
  assert.ok(repair.issues.some((item) => item.stage === "critic_language"));
  assert.equal(result.critique.issues[0].targetRef, "HOOK_LINE");
  assert.equal(result.critique.issues[0].target.field, "line");
});

test("aliases and unknown scene targetRefs are rejected without guessing", () => {
  for (const targetRef of ["openingVisual", "hookText", "sceneDialogue", "narrationText", "SCENE:scene-99:DIALOGUE"]) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("scene_filler", targetRef))), draft());
    assert.equal(parsed.value, null);
    assert.ok(parsed.issues.some((item) => item.code === "invalid_target_ref"), targetRef);
    assert.equal(runtime.resolveCriticTargetRef(draft(), targetRef), null);
  }
});

test("invalid target alias repairs to canonical address without changing critique semantics", async () => {
  const requests = [];
  const invalid = critique(issue("opening_visual_mismatch", "openingVisual", { briefField: "opening.visual" }));
  const repaired = critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual" }));
  const result = await runtime.generateScriptCritique(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? invalid : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(result.critique.issues[0].target.field, "openingVisualExecution");
  const payload = JSON.parse(requests[1].messages[1].content);
  assert.ok(payload.targetCatalog.some((item) => item.targetRef === "HOOK_OPENING_VISUAL"));
  assert.deepEqual(payload.repair.targetCatalog, payload.targetCatalog);
  assert.deepEqual(payload.repair.allowedBriefFields, runtime.CRITIC_BRIEF_FIELD_VALUES);
});

test("address repair requires the replacement address and discards unrelated mutations", async () => {
  const invalid = critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisual" }, { briefField: "opening.visual" }));
  let missingCalls = 0;
  const missing = await runtime.generateScriptCritique(input(), async () => response(++missingCalls === 1 ? invalid : pass()));
  assert.equal(missing.status, "failure");
  assert.equal(missing.metadata.errorType, "repair_failed");

  for (const changed of [
    critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual", severity: "minor" })),
    critique(issue("weak_hook_execution", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual" })),
  ]) {
    let calls = 0;
    const result = await runtime.generateScriptCritique(input(), async () => response(++calls === 1 ? invalid : changed));
    assert.equal(calls, 2);
    assert.equal(result.status, "success");
    assert.equal(result.critique.issues[0].targetRef, "HOOK_OPENING_VISUAL");
    assert.equal(result.critique.issues[0].code, "opening_visual_mismatch");
    assert.equal(result.critique.issues[0].severity, "major");
  }
});

test("score and other ranking fields are rejected by the strict result parser", () => {
  const parsed = runtime.parseScriptCriticResult(JSON.stringify({ ...pass(), score: 92 }), draft());
  assert.equal(parsed.value, null);
  assert.ok(parsed.issues.some((item) => item.code === "unexpected_field" && item.path === "score"));
});

test("schema failure receives one repair and a second invalid response fails explicitly", async () => {
  let calls = 0;
  const result = await runtime.generateScriptCritique(input(), async () => { calls += 1; return response("not-json"); });
  assert.equal(calls, 2);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(result.metadata.errorType, "repair_failed");
  assert.equal(result.metadata.fallbackUsed, false);
});

test("provider transport failure is explicit, performs no repair and has no fallback", async () => {
  let calls = 0;
  const events = [];
  const result = await runtime.generateScriptCritique(input(), async () => { calls += 1; throw { category: "timeout" }; }, { observe: (event) => events.push(event) });
  assert.equal(calls, 1);
  assert.equal(result.status, "failure");
  assert.equal(result.metadata.errorType, "timeout");
  assert.equal(result.metadata.repairAttempted, false);
  assert.equal(result.metadata.fallbackUsed, false);
  assert.equal(events.at(-1).stage, "provider_transport");
});

test("identity and deterministic draft failures stop before the Provider", async () => {
  for (const invalid of [
    input({ projectId: "project-b" }),
    input({ creativeBriefReference: { briefId: "creative-brief-a", briefRevisionId: "wrong" } }),
    input({ productContextFingerprint: "wrong" }),
    input({ scriptDraft: draft({ title: "English source title" }) }),
  ]) {
    let calls = 0;
    const result = await runtime.generateScriptCritique(invalid, async () => { calls += 1; return response(pass()); });
    assert.equal(calls, 0);
    assert.equal(result.status, "failure");
    assert.equal(result.metadata.errorType, "invalid_input");
  }
});

test("prompt is Brief-aware, category-neutral, bounded, and never asks for rewrite or scoring", () => {
  const messages = runtime.buildScriptCriticMessages(input());
  const payload = JSON.parse(messages[1].content);
  assert.equal(payload.lockedCreativeBrief.creativeAngle, brief().direction.creativeAngle);
  assert.equal(payload.canonicalProductTruth.productName, "CrystalArmor");
  assert.equal(payload.scriptDraft.scenes[0].id, "hook");
  assert.match(messages[0].content, /do not rewrite/i);
  assert.match(messages[0].content, /do not score/i);
  assert.doesNotMatch(messages.map((item) => item.content).join("\n"), /choose (?:a |the )?creative angle|replaceEntireScript|if category/i);
  assert.ok(messages.reduce((sum, item) => sum + item.content.length, 0) < 14_000);
});

test("all five categories use the same Critic runtime and contract", async () => {
  const categories = [
    ["Screen Protector", "accessory"], ["Probiotic Toothpaste", "oral care"], ["Mascara", "beauty"],
    ["Moisturizing Stick", "skin care"], ["Electric Toothbrush", "personal care"],
  ];
  for (const [name, category] of categories) {
    const canonicalProductContext = context(name, category);
    const creativeBrief = brief(canonicalProductContext);
    const result = await runtime.generateScriptCritique(input({ canonicalProductContext, creativeBrief, productContextFingerprint: selection.productContextFingerprint(canonicalProductContext) }), async () => response(pass()));
    assert.equal(result.status, "success", name);
  }
});

test("Preview provider override is purpose-specific and production behavior is unchanged", () => {
  assert.equal(route.resolveScriptCriticProvider("doubao", "preview", "deepseek", "openai"), "deepseek");
  assert.equal(route.resolveScriptCriticProvider("doubao", "preview", "", "deepseek"), "deepseek");
  assert.equal(route.resolveScriptCriticProvider("doubao", "production", "deepseek", "deepseek"), "doubao");
});

test("API route rejects incomplete input before provider resolution", async () => {
  const response = await route.POST(new Request("http://localhost/api/script-critic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "project-a" }),
  }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.type, "invalid_input");
});

test("source contains no category mapping, legacy fallback, persistence or Script mutation", async () => {
  const [runtimeSource, routeSource] = await Promise.all([
    readFile(new URL("../app/brief-driven-script-critic.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/script-critic/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(runtimeSource, /category\s*===|switch\s*\(.*category|buildCreativeConcepts|\/api\/scripts|project-memory|scriptVersions|selectedScriptRevisionId/i);
  assert.match(routeSource, /purpose:\s*"script-critic"/);
  assert.doesNotMatch(routeSource, /purpose:\s*"script-writer"|\/api\/scripts/);
});
