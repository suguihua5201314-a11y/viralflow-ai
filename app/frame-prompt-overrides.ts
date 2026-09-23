import type { FramePromptBundle } from "./frame-prompt";

export type FramePromptOverrideFields = Partial<Pick<
  FramePromptBundle,
  "startFramePrompt" | "endFramePrompt" | "imagePrompt" | "videoPrompt" | "negativePrompt"
>>;

export type FramePromptOverrideKey = keyof FramePromptOverrideFields;

export type FramePromptOverride = FramePromptOverrideFields & {
  projectId: string;
  scriptIdentity: string;
  shotId: string;
};

export type FramePromptIdentity = Pick<FramePromptOverride, "projectId" | "scriptIdentity" | "shotId">;

const promptKeys: FramePromptOverrideKey[] = [
  "startFramePrompt",
  "endFramePrompt",
  "imagePrompt",
  "videoPrompt",
  "negativePrompt",
];

export function matchesFramePromptOverride(record: FramePromptOverride, identity: FramePromptIdentity) {
  return record.projectId === identity.projectId &&
    record.scriptIdentity === identity.scriptIdentity &&
    record.shotId === identity.shotId;
}

export function findFramePromptOverride(records: FramePromptOverride[] | undefined, identity: FramePromptIdentity) {
  return (records || []).find((record) => matchesFramePromptOverride(record, identity));
}

export function effectiveFramePrompts(generated: FramePromptBundle, override?: FramePromptOverride): FramePromptBundle {
  if (!override) return generated;
  const fields = Object.fromEntries(promptKeys.flatMap((key) => typeof override[key] === "string" ? [[key, override[key]]] : []));
  return { ...generated, ...fields };
}

export function saveFramePromptOverride(
  records: FramePromptOverride[] | undefined,
  identity: FramePromptIdentity,
  key: FramePromptOverrideKey,
  value: string,
  generatedValue: string,
) {
  const current = records || [];
  const existing = findFramePromptOverride(current, identity);
  const trimmed = value.trim();
  const nextFields: FramePromptOverrideFields = { ...(existing || {}) };
  if (!trimmed || trimmed === generatedValue.trim()) delete nextFields[key];
  else nextFields[key] = trimmed;
  const hasFields = promptKeys.some((field) => typeof nextFields[field] === "string");
  const withoutCurrent = current.filter((record) => !matchesFramePromptOverride(record, identity));
  return hasFields ? [...withoutCurrent, { ...identity, ...nextFields }] : withoutCurrent;
}

export function resetFramePromptOverride(
  records: FramePromptOverride[] | undefined,
  identity: FramePromptIdentity,
  key: FramePromptOverrideKey,
) {
  const current = records || [];
  const existing = findFramePromptOverride(current, identity);
  if (!existing) return current;
  const next = { ...existing };
  delete next[key];
  const hasFields = promptKeys.some((field) => typeof next[field] === "string");
  const withoutCurrent = current.filter((record) => !matchesFramePromptOverride(record, identity));
  return hasFields ? [...withoutCurrent, next] : withoutCurrent;
}
