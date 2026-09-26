import type { CreativeDirectionResult } from "./creative-directions";
import { canonicalizeCreativeDirection, type CanonicalCreativeDirection } from "./creative-opportunity-selection";

export type CreativeDirectionSession = {
  directions: CanonicalCreativeDirection[];
  status: "idle" | "loading" | "success" | "partial" | "error";
  error: string;
  requestId?: string;
  selectingOpportunityId?: string;
  selectedOpportunityId?: string;
  briefStatus?: "idle" | "loading" | "ready" | "error";
  briefError?: string;
  briefRequestId?: string;
};

export type CreativeDirectionSessions = Record<string, CreativeDirectionSession>;

export const emptyCreativeDirectionSession = (): CreativeDirectionSession => ({ directions: [], status: "idle", error: "" });

export function beginCreativeDirectionRequest(sessions: CreativeDirectionSessions, projectId: string, requestId: string) {
  const current = sessions[projectId] || emptyCreativeDirectionSession();
  return { ...sessions, [projectId]: { ...current, status: "loading" as const, error: "", requestId } };
}

export function completeCreativeDirectionRequest(
  sessions: CreativeDirectionSessions,
  projectId: string,
  requestId: string,
  result: Pick<CreativeDirectionResult, "status" | "directions">,
) {
  const current = sessions[projectId];
  if (!current || current.requestId !== requestId) return sessions;
  const directions = result.directions.map((candidate) => canonicalizeCreativeDirection(candidate));
  return {
    ...sessions,
    [projectId]: {
      ...current,
      directions,
      status: result.status === "partial" ? "partial" as const : "success" as const,
      error: "",
      requestId: undefined,
      selectingOpportunityId: undefined,
    },
  };
}

export function failCreativeDirectionRequest(sessions: CreativeDirectionSessions, projectId: string, requestId: string, error: string) {
  const current = sessions[projectId];
  if (!current || current.requestId !== requestId) return sessions;
  return { ...sessions, [projectId]: { ...current, status: "error" as const, error, requestId: undefined } };
}

export function markCreativeDirectionSelection(sessions: CreativeDirectionSessions, projectId: string, opportunityId: string, selected: boolean) {
  const current = sessions[projectId] || emptyCreativeDirectionSession();
  return {
    ...sessions,
    [projectId]: {
      ...current,
      selectingOpportunityId: selected ? undefined : opportunityId,
      selectedOpportunityId: selected ? opportunityId : current.selectedOpportunityId,
    },
  };
}

export function beginCreativeBriefRequest(sessions: CreativeDirectionSessions, projectId: string, opportunityId: string, requestId: string) {
  const current = sessions[projectId] || emptyCreativeDirectionSession();
  return { ...sessions, [projectId]: { ...current, selectingOpportunityId: opportunityId, selectedOpportunityId: opportunityId, briefStatus: "loading" as const, briefError: "", briefRequestId: requestId } };
}

export function completeCreativeBriefRequest(sessions: CreativeDirectionSessions, projectId: string, opportunityId: string, requestId: string) {
  const current = sessions[projectId];
  if (!current || current.briefRequestId !== requestId || current.selectingOpportunityId !== opportunityId) return sessions;
  return { ...sessions, [projectId]: { ...current, selectingOpportunityId: undefined, selectedOpportunityId: opportunityId, briefStatus: "ready" as const, briefError: "", briefRequestId: undefined } };
}

export function failCreativeBriefRequest(sessions: CreativeDirectionSessions, projectId: string, opportunityId: string, requestId: string, error: string) {
  const current = sessions[projectId];
  if (!current || current.briefRequestId !== requestId || current.selectingOpportunityId !== opportunityId) return sessions;
  return { ...sessions, [projectId]: { ...current, selectingOpportunityId: undefined, selectedOpportunityId: opportunityId, briefStatus: "error" as const, briefError: error, briefRequestId: undefined } };
}
