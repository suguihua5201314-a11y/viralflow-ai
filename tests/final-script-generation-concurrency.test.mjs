import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const stage = fs.readFileSync(new URL("../app/components/script/final-script-stage.tsx", import.meta.url), "utf8");

test("final script generation rejects a second request before emitting or fetching", () => {
  const start = page.indexOf("async function generateFinalScript()");
  const end = page.indexOf("function saveScriptVersion", start);
  const source = page.slice(start, end);
  const guard = source.indexOf("if(activeFinalScriptRequestId.current)return;");
  const clickEvent = source.indexOf('event:"script_generation_clicked"');
  const writerFetch = source.indexOf("observedWriterFetch");

  assert.ok(guard >= 0, "generation must have a synchronous in-flight guard");
  assert.ok(guard < clickEvent, "duplicate clicks must be ignored before diagnostics are emitted");
  assert.ok(guard < writerFetch, "duplicate clicks must be ignored before Writer fetch starts");
});

test("final script actions expose progress and cannot start parallel work", () => {
  assert.match(stage, /aria-busy=\{busy\}/);
  assert.match(stage, /disabled=\{busy\} onClick=\{onGenerate\}>\{busy \? progressCopy\[status\] : "重新生成"\}/);
  assert.match(stage, /disabled=\{busy\} onClick=\{onEdit\}/);
  assert.match(stage, /disabled=\{busy\} onClick=\{onAiModify\}/);
  assert.match(stage, /disabled=\{busy\} onClick=\{onDirector\}/);
});
