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
    title: "An everyday viewpoint",
    hook: { line: "What changes when the viewpoint moves?", openingVisualExecution: "The same product is shown as the viewpoint shifts." },
    scenes: [
      { id: "hook", purpose: "hook", visual: "The product fills the first frame.", action: "Shift the viewpoint while keeping the setting unchanged.", dialogue: "What changes when the viewpoint moves?", durationHint: 3, briefTrace: { executesOpeningVisual: true } },
      { id: "context", purpose: "context", visual: "The product stays in an ordinary commute setting.", action: "Keep the action continuous.", dialogue: "This is the everyday situation I wanted to check.", durationHint: 4 },
      { id: "product", purpose: "product", visual: "The product and alignment applicator appear together.", action: "Use the alignment applicator in one clear motion.", dialogue: "The alignment applicator helps with placement.", durationHint: 4 },
      { id: "evidence", purpose: "evidence", visual: "The use is visible without a cut.", action: "Show the ordinary result under the same conditions.", dialogue: "Here is the same use from the second viewpoint.", durationHint: 5, evidenceRole: "routine-context", briefTrace: { executesEvidence: true } },
      { id: "cta", purpose: "cta", visual: "The compatibility information is visible.", action: "Point to the compatible model information.", dialogue: "Check which option matches your product.", durationHint: 4, briefTrace: { executesCTA: true } },
    ],
    fullNarration: "What changes when the viewpoint moves? This is the everyday situation I wanted to check. The alignment applicator helps with placement. Here is the same use from the second viewpoint. Check which option matches your product.",
    cta: "Check which option matches your product.",
    language: "English",
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
    language: "English",
    preferences: { creatorStyle: "UGC", durationPreference: 20, spokenDensity: "balanced", tone: "natural" },
    ...overrides,
  };
}

const pass = (summary = "Aligned with the selected Brief.") => ({ verdict: "pass", issues: [], summary });
const issue = (code, target, overrides = {}) => ({ code, severity: "major", target, message: "The execution drifts from the locked Brief.", rewriteInstruction: "Correct only this localized execution issue while preserving the Brief.", deterministic: false, ...overrides });
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
  assert.match(repair.instruction, /Correct only invalid structured addresses/i);
  assert.match(repair.instruction, /Do not add or delete issues, change critique meaning, rewrite the script/i);
  assert.deepEqual(sourceInput, before);
});

test("invalid scene target and invalid field are rejected and repaired at most once", async () => {
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
  assert.ok(repair.issues.some((item) => item.code === "unknown_scene" && item.path === "issues.0.target.sceneId"));
  assert.deepEqual(repair.targetAddressContract, runtime.CRITIC_TARGET_SCHEMA);
  assert.deepEqual(repair.validSceneIds, draft().scenes.map((scene) => scene.id));
});

test("canonical target schema accepts and resolves every legal address to one real Draft node", () => {
  const value = draft();
  for (const [scope, fields] of Object.entries(runtime.CRITIC_TARGET_SCHEMA)) {
    for (const field of fields) {
      const target = scope === "scene" ? { scope, sceneId: "evidence", field } : { scope, field };
      const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("scene_filler", target))), value);
      assert.equal(parsed.issues.length, 0, `${scope}.${field}`);
      const resolved = runtime.resolveCriticTarget(value, target);
      assert.ok(resolved, `${scope}.${field}`);
      assert.equal(typeof resolved.value, "string");
      assert.ok(resolved.path.length > 0);
    }
  }
});

test("target scope, field and sceneId rules reject aliases and cross-scope addresses", () => {
  const invalidTargets = [
    { target: { scope: "hook", field: "hookLine" }, code: "invalid_target_field" },
    { target: { scope: "hook", field: "dialogue" }, code: "invalid_target_field" },
    { target: { scope: "scene", sceneId: "evidence", field: "line" }, code: "invalid_target_field" },
    { target: { scope: "cta", field: "line" }, code: "invalid_target_field" },
    { target: { scope: "narration", field: "narration" }, code: "invalid_target_field" },
    { target: { scope: "scene", sceneId: "scene-99", field: "dialogue" }, code: "unknown_scene" },
    { target: { scope: "cta", sceneId: "cta", field: "cta" }, code: "unexpected_scene_id" },
  ];
  for (const { target, code } of invalidTargets) {
    const parsed = runtime.parseScriptCriticResult(JSON.stringify(critique(issue("scene_filler", target))), draft());
    assert.equal(parsed.value, null);
    assert.ok(parsed.issues.some((item) => item.code === code), JSON.stringify(target));
    assert.equal(runtime.resolveCriticTarget(draft(), target), null);
  }
});

test("invalid target alias repairs to canonical address without changing critique semantics", async () => {
  const requests = [];
  const invalid = critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisual" }, { briefField: "opening.visual" }));
  const repaired = critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual" }));
  const result = await runtime.generateScriptCritique(input(), async (request) => {
    requests.push(request);
    return response(requests.length === 1 ? invalid : repaired);
  });
  assert.equal(result.status, "success");
  assert.equal(result.critique.issues[0].target.field, "openingVisualExecution");
  const payload = JSON.parse(requests[1].messages[1].content);
  assert.deepEqual(payload.targetAddressContract, runtime.CRITIC_TARGET_SCHEMA);
  assert.deepEqual(payload.repair.targetAddressContract, runtime.CRITIC_TARGET_SCHEMA);
  assert.deepEqual(payload.repair.allowedBriefFields, runtime.CRITIC_BRIEF_FIELD_VALUES);
});

test("address repair cannot add, delete, or semantically alter Critic issues", async () => {
  for (const changed of [
    pass(),
    critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual", severity: "minor" })),
    critique(issue("weak_hook_execution", { scope: "hook", field: "openingVisualExecution" }, { briefField: "opening.visual" })),
  ]) {
    let calls = 0;
    const invalid = critique(issue("opening_visual_mismatch", { scope: "hook", field: "openingVisual" }, { briefField: "opening.visual" }));
    const result = await runtime.generateScriptCritique(input(), async () => response(++calls === 1 ? invalid : changed));
    assert.equal(calls, 2);
    assert.equal(result.status, "failure");
    assert.equal(result.metadata.errorType, "repair_failed");
    assert.ok(result.validationIssues.some((item) => item.code === "repair_changed_critique"));
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
    input({ scriptDraft: draft({ language: "Spanish" }) }),
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
