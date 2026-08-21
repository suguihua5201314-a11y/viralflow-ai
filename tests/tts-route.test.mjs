import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("tts-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const runtime = {
  waitUntil() {},
  passThroughOnException() {},
};

test("POST /api/tts validates the VoiceStudio request body", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "", speaker: "test-speaker" }),
    }),
    {},
    runtime,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "请输入需要配音的文本" });
});

test("POST /api/tts reports missing server configuration without exposing secrets", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "这是一段接口契约测试文本。",
        language: "zh",
        speaker: "zh_female_shuangkuaisisi_uranus_bigtts",
        speed: 1,
      }),
    }),
    {},
    runtime,
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error:
      "豆包配音尚未配置：请添加 VOLC_TTS_APP_ID 和 VOLC_TTS_API_KEY",
  });
});
