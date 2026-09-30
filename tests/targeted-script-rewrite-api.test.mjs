import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const route = await jiti.import("../app/api/script-rewriter/route.ts");

test("script-rewriter route rejects malformed input safely", async () => {
  const response = await route.POST(new Request("http://localhost/api/script-rewriter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }));
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.status, "failure");
  assert.equal(payload.error.type, "invalid_input");
});

test("route is an independent thin adapter with one script-rewriter Provider purpose and no persistence or fallback", async () => {
  const source = await readFile(new URL("../app/api/script-rewriter/route.ts", import.meta.url), "utf8");
  assert.match(source, /purpose:\s*"script-rewriter"/);
  assert.doesNotMatch(source, /mutateProjectMemory|scriptVersions|selectedScriptRevisionId|\/api\/scripts|\/api\/copilot|generateBriefDrivenScript|generateScriptCritique/);
  assert.match(source, /generateTargetedScriptRewrite/);
});
