export type ScriptRevisionSource = {
  revisionId?: string;
  id?: string | number;
  title?: string;
  product?: string;
  narration?: string;
};

export type ScriptScene = { time: string; visual: string; line: string; edit: string };
export type ScriptBlockValue = {
  key: "hook" | "conflict" | "product" | "proof" | "points" | "cta";
  duration: string;
  text: string;
};

const revisionPrefix = "script-revision-";

export function createScriptRevisionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return `${revisionPrefix}${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues(bytes);
  if (!bytes.some(Boolean)) throw new Error("Secure script revision identity is unavailable");
  return `${revisionPrefix}${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function scriptRevisionIdentity(script: ScriptRevisionSource | null | undefined) {
  const canonical = script?.revisionId?.trim();
  if (canonical) return canonical;
  if (script?.id !== undefined && script.id !== null && String(script.id).trim()) return `legacy-script:${String(script.id).trim()}`;
  return `legacy-copy:${script?.title || ""}|${script?.product || ""}|${script?.narration || ""}`;
}

export function ensureScriptRevision<T extends ScriptRevisionSource>(script: T, revisionId = script.revisionId?.trim() || createScriptRevisionId()): T & { revisionId: string } {
  return { ...script, revisionId };
}

const fallbackTimes = ["0–3s", "3–8s", "8–15s", "15–21s", "21–26s", "26–30s"];

export function synchronizeScriptScenes(scenes: ScriptScene[] | undefined, blocks: ScriptBlockValue[]) {
  const current = scenes || [];
  return blocks.map((block, index) => {
    const source = current[index] || (index === blocks.length - 1 ? current.at(-1) : undefined);
    return {
      time: block.duration || source?.time || fallbackTimes[index],
      visual: source?.visual || "",
      line: block.text.trim(),
      edit: source?.edit || "",
    };
  });
}
