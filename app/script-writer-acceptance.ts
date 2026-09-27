import type { ScriptDraftV2, ScriptWriterValidationIssue } from "./brief-driven-script";
import type { StructuredScript } from "./script-generation";
import type { ProviderId } from "./provider-types";

export type ScriptWriterAcceptanceIdentity = { requestId: string; projectId: string; creativeBriefId: string; creativeBriefRevisionId: string; productContextFingerprint: string };
export type ScriptWriterAcceptanceMetadata = { providerUsed: ProviderId | null; model: string | null; latencyMs: number | null; repairAttempted: boolean };
export type ScriptWriterAcceptanceState = {
  status: "idle" | "loading" | "success" | "error";
  identity?: ScriptWriterAcceptanceIdentity;
  script?: StructuredScript;
  draft?: ScriptDraftV2;
  metadata?: ScriptWriterAcceptanceMetadata;
  error?: string;
  diagnostic?: string;
};

export const emptyScriptWriterAcceptanceState = (): ScriptWriterAcceptanceState => ({ status: "idle" });
export const beginScriptWriterAcceptance = (identity: ScriptWriterAcceptanceIdentity): ScriptWriterAcceptanceState => ({ status: "loading", identity });

export function sameScriptWriterAcceptanceIdentity(current: ScriptWriterAcceptanceIdentity | undefined | null, expected: ScriptWriterAcceptanceIdentity) {
  return Boolean(current && current.requestId === expected.requestId && current.projectId === expected.projectId && current.creativeBriefId === expected.creativeBriefId && current.creativeBriefRevisionId === expected.creativeBriefRevisionId && current.productContextFingerprint === expected.productContextFingerprint);
}

export function completeScriptWriterAcceptance(current: ScriptWriterAcceptanceState, identity: ScriptWriterAcceptanceIdentity, result: { script: StructuredScript; draft: ScriptDraftV2; metadata: ScriptWriterAcceptanceMetadata }): ScriptWriterAcceptanceState {
  return sameScriptWriterAcceptanceIdentity(current.identity, identity) ? { status: "success", identity, ...result } : current;
}

export function failScriptWriterAcceptance(current: ScriptWriterAcceptanceState, identity: ScriptWriterAcceptanceIdentity, error: string, issue?: { stage: string; code: string; path?: string }): ScriptWriterAcceptanceState {
  if (!sameScriptWriterAcceptanceIdentity(current.identity, identity)) return current;
  return { status: "error", identity, error, diagnostic: issue ? [issue.stage, issue.code, issue.path].filter(Boolean).join(" · ") : undefined };
}

export async function parseScriptWriterAcceptanceResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;
  if (contentType.includes("application/json")) { try { data = await response.json(); } catch { data = null; } }
  const payload = data && typeof data === "object" ? data as Record<string, unknown> : null;
  if (!response.ok || payload?.status !== "success" || !payload.script || !payload.draft) {
    const errorValue = payload?.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : null;
    const issues = Array.isArray(payload?.issues) ? payload.issues : [];
    const firstIssue = issues.find((value): value is ScriptWriterValidationIssue => Boolean(value && typeof value === "object" && "code" in value && "stage" in value));
    const error = new Error(typeof errorValue?.message === "string" ? errorValue.message : response.status === 504 ? "脚本生成超时，请重试。" : "脚本生成失败，请重试。") as Error & { validationIssue?: ScriptWriterValidationIssue };
    if (firstIssue) error.validationIssue = firstIssue;
    throw error;
  }
  return payload as unknown as { status: "success"; script: StructuredScript; draft: ScriptDraftV2; metadata: ScriptWriterAcceptanceMetadata };
}
