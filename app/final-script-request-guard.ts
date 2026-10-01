export type FinalScriptRequestContext = {
  requestId: string;
  activeRequestId: string;
  projectId: string;
  activeProjectId: string | null;
  briefRevisionId: string;
  activeBriefRevisionId: string | null;
  productContextFingerprint: string;
  activeProductContextFingerprint: string | undefined;
};

export type FinalScriptRequestAuthority = "current" | "context_stale" | "superseded";

export function finalScriptRequestAuthority(context: FinalScriptRequestContext): FinalScriptRequestAuthority {
  if (context.activeRequestId !== context.requestId) return "superseded";
  if (
    context.activeProjectId !== context.projectId ||
    context.activeBriefRevisionId !== context.briefRevisionId ||
    context.activeProductContextFingerprint !== context.productContextFingerprint
  ) return "context_stale";
  return "current";
}

export function shouldReleaseFinalScriptLoading(authority: FinalScriptRequestAuthority): boolean {
  return authority === "context_stale";
}
