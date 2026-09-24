import { directorContextId, type DirectorRequest, type DirectorResult } from "./director-core";
import type { PersistentProject, ProjectAssetBundle } from "./project-memory";

export type PersistedDirectorWorkspace = {
  result: DirectorResult;
  shots: Array<{ shotId?: string }>;
  selectedShot?: number | null;
  [key: string]: unknown;
};

export type DirectorRequestIdentity = {
  projectId: string;
  scriptRevisionId: string;
  contextId: string;
};

export function directorRequestIdentity(
  projectId: string | null | undefined,
  request: DirectorRequest | null | undefined,
): DirectorRequestIdentity | null {
  if (!projectId || !request) return null;
  return {
    projectId,
    scriptRevisionId: request.scriptRevisionId || "",
    contextId: directorContextId(request),
  };
}

export function sameDirectorRequestIdentity(
  left: DirectorRequestIdentity | null,
  right: DirectorRequestIdentity | null,
) {
  return Boolean(
    left &&
      right &&
      left.projectId === right.projectId &&
      left.scriptRevisionId === right.scriptRevisionId &&
      left.contextId === right.contextId,
  );
}

export function persistedDirectorWorkspace(value: unknown): PersistedDirectorWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedDirectorWorkspace>;
  return candidate.result && Array.isArray(candidate.shots)
    ? (candidate as PersistedDirectorWorkspace)
    : null;
}

function workspaceMatchesIdentity(
  workspace: PersistedDirectorWorkspace,
  identity: DirectorRequestIdentity,
) {
  const metadata = workspace.result.metadata;
  return (
    metadata.contextId === identity.contextId &&
    (!metadata.sourceScriptRevisionId ||
      metadata.sourceScriptRevisionId === identity.scriptRevisionId)
  );
}

function workspaceMatchesCompleteIdentity(
  project: PersistentProject,
  workspace: PersistedDirectorWorkspace,
  identity: DirectorRequestIdentity,
) {
  return (
    project.id === identity.projectId &&
    workspace.result.metadata.contextId === identity.contextId &&
    Boolean(identity.scriptRevisionId) &&
    workspace.result.metadata.sourceScriptRevisionId === identity.scriptRevisionId
  );
}

function safeShotSelection(workspace: PersistedDirectorWorkspace) {
  const selected = workspace.selectedShot;
  if (!workspace.shots.length) {
    return selected === null ? workspace : { ...workspace, selectedShot: null };
  }
  if (typeof selected === "number" && selected >= 0 && selected < workspace.shots.length) return workspace;
  return { ...workspace, selectedShot: 0 };
}

export function resolveDirectorWorkspace(
  project: PersistentProject | null | undefined,
  request: DirectorRequest | null | undefined,
) {
  const identity = directorRequestIdentity(project?.id, request);
  if (!project || !identity) return null;
  const scoped = persistedDirectorWorkspace(project.assets.directorContexts?.[identity.contextId]);
  if (scoped && workspaceMatchesIdentity(scoped, identity)) return safeShotSelection(scoped);
  const legacy = persistedDirectorWorkspace(project.assets.directorResult);
  return legacy && workspaceMatchesIdentity(legacy, identity) ? safeShotSelection(legacy) : null;
}

function carryLegacyContext(assets: ProjectAssetBundle) {
  const contexts = { ...(assets.directorContexts || {}) };
  const legacy = persistedDirectorWorkspace(assets.directorResult);
  const legacyContextId = legacy?.result.metadata.contextId?.trim();
  if (legacy && legacyContextId && !contexts[legacyContextId]) contexts[legacyContextId] = legacy;
  return contexts;
}

export function saveDirectorWorkspace(
  project: PersistentProject,
  request: DirectorRequest,
  value: unknown,
  activate: boolean,
): PersistentProject {
  const workspace = persistedDirectorWorkspace(value);
  const identity = directorRequestIdentity(project.id, request);
  if (!workspace || !identity || !workspaceMatchesIdentity(workspace, identity)) return project;
  const contexts = carryLegacyContext(project.assets);
  contexts[identity.contextId] = workspace;
  const assets: ProjectAssetBundle = {
    ...project.assets,
    directorContexts: contexts,
    ...(activate
      ? { currentDirectorContextId: identity.contextId, directorResult: workspace }
      : {}),
  };
  if (JSON.stringify(assets) === JSON.stringify(project.assets)) return project;
  return {
    ...project,
    assets,
  };
}

export function selectDirectorShot(
  project: PersistentProject,
  request: DirectorRequest,
  selectedShot: number,
) {
  const identity = directorRequestIdentity(project.id, request);
  const workspace = resolveDirectorWorkspace(project, request);
  if (!identity || !workspace || selectedShot < 0 || selectedShot >= workspace.shots.length) return project;
  return saveDirectorWorkspace(project, request, { ...workspace, selectedShot }, true);
}

export function activateDirectorContext(
  project: PersistentProject,
  identity: DirectorRequestIdentity,
  options: { shotId?: string } = {},
) {
  if (project.id !== identity.projectId) return project;
  const exact = persistedDirectorWorkspace(project.assets.directorContexts?.[identity.contextId]);
  const legacy = persistedDirectorWorkspace(project.assets.directorResult);
  const candidate = exact && workspaceMatchesCompleteIdentity(project, exact, identity)
    ? exact
    : legacy && workspaceMatchesCompleteIdentity(project, legacy, identity)
      ? legacy
      : null;
  if (!candidate) return project;
  const requestedIndex = options.shotId
    ? candidate.shots.findIndex((shot) => shot.shotId === options.shotId)
    : -1;
  const workspace = safeShotSelection(
    requestedIndex >= 0 ? { ...candidate, selectedShot: requestedIndex } : candidate,
  );
  const assets: ProjectAssetBundle = {
    ...project.assets,
    directorContexts: { ...(project.assets.directorContexts || {}), [identity.contextId]: workspace },
    currentDirectorContextId: identity.contextId,
    directorResult: workspace,
  };
  if (JSON.stringify(assets) === JSON.stringify(project.assets)) return project;
  return { ...project, assets };
}
