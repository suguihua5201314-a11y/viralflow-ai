import type { ScriptCriticResult, ScriptCriticValidationIssue } from "./brief-driven-script-critic";
import type { ProviderId } from "./provider-types";

export type ScriptCriticAcceptanceIdentity = {
  requestId: string;
  projectId: string;
  creativeBriefId: string;
  creativeBriefRevisionId: string;
  productContextFingerprint: string;
  writerRequestId: string;
};

export type ScriptCriticAcceptanceMetadata = {
  providerUsed: ProviderId | null;
  model: string | null;
  latencyMs: number | null;
  repairAttempted: boolean;
};

export type ScriptCriticAcceptanceState = {
  status: "idle" | "loading" | "success" | "error";
  identity?: ScriptCriticAcceptanceIdentity;
  critique?: ScriptCriticResult;
  metadata?: ScriptCriticAcceptanceMetadata;
  error?: string;
  diagnostic?: string;
};

export const emptyScriptCriticAcceptanceState = (): ScriptCriticAcceptanceState => ({ status: "idle" });
export const beginScriptCriticAcceptance = (identity: ScriptCriticAcceptanceIdentity): ScriptCriticAcceptanceState => ({ status: "loading", identity });

export function sameScriptCriticAcceptanceIdentity(current: ScriptCriticAcceptanceIdentity | undefined | null, expected: ScriptCriticAcceptanceIdentity) {
  return Boolean(current
    && current.requestId === expected.requestId
    && current.projectId === expected.projectId
    && current.creativeBriefId === expected.creativeBriefId
    && current.creativeBriefRevisionId === expected.creativeBriefRevisionId
    && current.productContextFingerprint === expected.productContextFingerprint
    && current.writerRequestId === expected.writerRequestId);
}

export function completeScriptCriticAcceptance(current: ScriptCriticAcceptanceState, identity: ScriptCriticAcceptanceIdentity, result: { critique: ScriptCriticResult; metadata: ScriptCriticAcceptanceMetadata }): ScriptCriticAcceptanceState {
  return sameScriptCriticAcceptanceIdentity(current.identity, identity) ? { status: "success", identity, ...result } : current;
}

export function failScriptCriticAcceptance(current: ScriptCriticAcceptanceState, identity: ScriptCriticAcceptanceIdentity, error: string, issue?: ScriptCriticValidationIssue): ScriptCriticAcceptanceState {
  if (!sameScriptCriticAcceptanceIdentity(current.identity, identity)) return current;
  return { status: "error", identity, error, diagnostic: issue ? [issue.stage, issue.code, issue.path].filter(Boolean).join(" · ") : undefined };
}

export async function parseScriptCriticAcceptanceResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;
  if (contentType.includes("application/json")) { try { data = await response.json(); } catch { data = null; } }
  const payload = data && typeof data === "object" ? data as Record<string, unknown> : null;
  if (!response.ok || payload?.status !== "success" || !payload.critique) {
    const errorValue = payload?.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : null;
    const issues = Array.isArray(payload?.validationIssues) ? payload.validationIssues : [];
    const firstIssue = issues.find((value): value is ScriptCriticValidationIssue => Boolean(value && typeof value === "object" && "code" in value && "stage" in value));
    const error = new Error(typeof errorValue?.message === "string" ? errorValue.message : response.status === 504 ? "脚本评审超时，请重试。" : "脚本评审失败，请重试。") as Error & { validationIssue?: ScriptCriticValidationIssue };
    if (firstIssue) error.validationIssue = firstIssue;
    throw error;
  }
  return payload as unknown as { status: "success"; critique: ScriptCriticResult; metadata: ScriptCriticAcceptanceMetadata };
}
