import type { ScriptCriticInput, ScriptCriticResult } from "./brief-driven-script-critic";
import { resolveCriticTarget, resolveCriticTargetRef } from "./brief-driven-script-critic";
import { CRITIC_ISSUE_CODE_VALUES, type CriticIssue, type ScriptDraftV2, type ScriptWriterInput, type ScriptWriterValidationIssue } from "./brief-driven-script";
import { validateScriptDraftDeterministically } from "./brief-driven-script";
import type { TargetedRewriteInput, TargetedRewriteMetadata } from "./brief-driven-script-rewriter";
import type { StructuredScript } from "./script-generation";

export type FinalScriptProgress = "writer" | "critic" | "rewrite" | "complete";
export type FinalScriptFailureStage = "writer" | "critic" | "rewrite" | "final_validation";

export type FinalScriptWriterResult = {
  script: StructuredScript & { revisionId: string };
  draft: ScriptDraftV2;
  metadata: { providerUsed?: string | null; model?: string | null; latencyMs?: number | null; repairAttempted?: boolean };
};

export type FinalScriptCriticResult = {
  critique: ScriptCriticResult;
  metadata: { providerUsed?: string | null; model?: string | null; latencyMs?: number | null; repairAttempted?: boolean };
};

export type FinalScriptRewriteResult = {
  script: StructuredScript & { revisionId: string };
  draft: ScriptDraftV2;
  metadata: TargetedRewriteMetadata;
};

export type FinalScriptOrchestrationInput = {
  writerInput: ScriptWriterInput;
  criticInput: Omit<ScriptCriticInput, "requestId" | "scriptDraft">;
  provider?: string;
};

export type FinalScriptOrchestrationClients = {
  write(input: ScriptWriterInput & { provider?: string }): Promise<FinalScriptWriterResult>;
  critique(input: ScriptCriticInput & { provider?: string }): Promise<FinalScriptCriticResult>;
  rewrite(input: TargetedRewriteInput & { provider?: string }): Promise<FinalScriptRewriteResult>;
};

export type FinalScriptOrchestrationResult =
  | {
      status: "success";
      script: StructuredScript & { revisionId: string };
      draft: ScriptDraftV2;
      sourceDraft: ScriptDraftV2;
      critique: ScriptCriticResult;
      rewritten: boolean;
      calls: { writer: 1; critic: 1; rewrite: 0 | 1 };
      metadata: { writer: FinalScriptWriterResult["metadata"]; critic: FinalScriptCriticResult["metadata"]; rewrite?: TargetedRewriteMetadata };
    }
  | {
      status: "failure";
      stage: FinalScriptFailureStage;
      code: string;
      issues: Array<{ code: string; path?: string; stage?: string }>;
      calls: { writer: number; critic: number; rewrite: number };
    };

const failure = (stage: FinalScriptFailureStage, code: string, calls: { writer: number; critic: number; rewrite: number }, issues: Array<{ code: string; path?: string; stage?: string }> = []): FinalScriptOrchestrationResult => ({ status: "failure", stage, code, issues, calls });
const safeErrorIssues = (error: unknown) => {
  if (!error || typeof error !== "object" || !("validationIssue" in error)) return [];
  const value = (error as { validationIssue?: unknown }).validationIssue;
  if (!value || typeof value !== "object" || !("code" in value) || typeof (value as { code?: unknown }).code !== "string") return [];
  const item = value as { code: string; path?: unknown; stage?: unknown };
  return [{ code: item.code, ...(typeof item.path === "string" ? { path: item.path } : {}), ...(typeof item.stage === "string" ? { stage: item.stage } : {}) }];
};

export function buildAuthorizedRewriteInput(
  input: FinalScriptOrchestrationInput,
  writer: FinalScriptWriterResult,
  critique: ScriptCriticResult,
): TargetedRewriteInput | null {
  if (critique.issues.length === 0) return null;
  const severityRank = { minor: 1, major: 2, critical: 3 } as const;
  const canonicalIssueCodes = new Set<string>(CRITIC_ISSUE_CODE_VALUES);
  const canonicalSeverity = (value: CriticIssue["severity"]): keyof typeof severityRank =>
    value === "critical" || value === "high" ? "critical" : value === "major" || value === "medium" ? "major" : "minor";
  const authorizedByTarget = new Map<string, TargetedRewriteInput["issues"][number]>();
  for (const item of critique.issues) {
    const resolved = resolveCriticTargetRef(writer.draft, item.targetRef);
    const current = resolved ? resolveCriticTarget(writer.draft, resolved) : null;
    if (!resolved || !current || JSON.stringify(resolved) !== JSON.stringify(item.target) || !canonicalIssueCodes.has(item.code)) return null;
    const severity = canonicalSeverity(item.severity);
    const existing = authorizedByTarget.get(item.targetRef);
    if (!existing) {
      authorizedByTarget.set(item.targetRef, {
      patchId: "",
      sourceScriptRevisionId: writer.script.revisionId,
      targetRef: item.targetRef,
      resolvedTarget: resolved,
      expectedCurrentValue: current.value,
      issueCode: item.code as TargetedRewriteInput["issues"][number]["issueCode"],
      severity,
      message: item.message,
      rewriteInstruction: item.rewriteInstruction,
      ...(item.briefField ? { briefField: item.briefField } : {}),
      });
      continue;
    }
    if (severityRank[severity] > severityRank[canonicalSeverity(existing.severity)]) {
      existing.severity = severity;
      existing.issueCode = item.code as TargetedRewriteInput["issues"][number]["issueCode"];
    }
    if (!existing.message.split("\n").includes(item.message)) existing.message = `${existing.message}\n${item.message}`;
    if (!existing.rewriteInstruction.split("\n").includes(item.rewriteInstruction)) existing.rewriteInstruction = `${existing.rewriteInstruction}\n${item.rewriteInstruction}`;
    if (existing.briefField !== item.briefField) delete existing.briefField;
  }
  const authorized = [...authorizedByTarget.values()].map((item, index) => ({
    ...item,
    patchId: `rewrite-${input.writerInput.requestId}-${index + 1}`,
  }));
  return {
    ...input.writerInput,
    languageContext: input.writerInput.languageContext!,
    requestId: `${input.writerInput.requestId}:rewrite`,
    sourceScriptRevisionId: writer.script.revisionId,
    currentDraft: writer.draft,
    issues: authorized as TargetedRewriteInput["issues"],
  };
}

export async function orchestrateFinalScript(
  input: FinalScriptOrchestrationInput,
  clients: FinalScriptOrchestrationClients,
  onProgress?: (progress: FinalScriptProgress) => void,
): Promise<FinalScriptOrchestrationResult> {
  const calls = { writer: 0, critic: 0, rewrite: 0 };
  let writer: FinalScriptWriterResult;
  try {
    onProgress?.("writer"); calls.writer = 1;
    writer = await clients.write({ ...input.writerInput, ...(input.provider ? { provider: input.provider } : {}) });
  } catch (error) {
    return failure("writer", error instanceof Error ? error.message : "writer_failed", calls, safeErrorIssues(error));
  }
  let critic: FinalScriptCriticResult;
  try {
    onProgress?.("critic"); calls.critic = 1;
    critic = await clients.critique({ ...input.criticInput, requestId: `${input.writerInput.requestId}:critic`, scriptDraft: writer.draft, ...(input.provider ? { provider: input.provider } : {}) });
  } catch (error) {
    return failure("critic", error instanceof Error ? error.message : "critic_failed", calls, safeErrorIssues(error));
  }
  if (critic.critique.verdict === "pass" && critic.critique.issues.length === 0) {
    const issues = validateScriptDraftDeterministically(input.writerInput, writer.draft);
    if (issues.length) return failure("final_validation", "final_validation_failed", calls, issues);
    onProgress?.("complete");
    return { status: "success", script: writer.script, draft: writer.draft, sourceDraft: writer.draft, critique: critic.critique, rewritten: false, calls: { writer: 1, critic: 1, rewrite: 0 }, metadata: { writer: writer.metadata, critic: critic.metadata } };
  }
  const rewriteInput = buildAuthorizedRewriteInput(input, writer, critic.critique);
  if (!rewriteInput) return failure("critic", "critic_issues_not_safely_targetable", calls);
  let rewritten: FinalScriptRewriteResult;
  try {
    onProgress?.("rewrite"); calls.rewrite = 1;
    rewritten = await clients.rewrite({ ...rewriteInput, ...(input.provider ? { provider: input.provider } : {}) });
  } catch (error) {
    return failure("rewrite", error instanceof Error ? error.message : "rewrite_failed", calls, safeErrorIssues(error));
  }
  const issues: ScriptWriterValidationIssue[] = validateScriptDraftDeterministically(input.writerInput, rewritten.draft);
  if (issues.length) return failure("final_validation", "final_validation_failed", calls, issues);
  onProgress?.("complete");
  return { status: "success", script: rewritten.script, draft: rewritten.draft, sourceDraft: writer.draft, critique: critic.critique, rewritten: true, calls: { writer: 1, critic: 1, rewrite: 1 }, metadata: { writer: writer.metadata, critic: critic.metadata, rewrite: rewritten.metadata } };
}
