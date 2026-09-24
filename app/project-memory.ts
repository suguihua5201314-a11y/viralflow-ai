import type { ActiveView } from "./navigation";
import type { FramePromptOverride } from "./frame-prompt-overrides";
import type { CreativeBriefV2 } from "./creative-contract";

export const PROJECT_MEMORY_KEY = "viralflow-project-memory-v1";
export const PROJECT_MEMORY_WRITER_KEY = "viralflow-project-memory-writer-v1";
export const PROJECT_MEMORY_VERSION = 1;
export const LEGACY_MEMORY_WRITER = "legacy/unknown";

export type ProjectAssetBundle = {
  analyzerResult?: unknown;
  replicationResult?: unknown;
  scriptVersions: unknown[];
  directorResult?: unknown;
  voiceResult?: unknown;
  framePromptOverrides?: FramePromptOverride[];
  creativeBriefRevisions?: CreativeBriefV2[];
  currentCreativeBriefRevisionId?: string;
};

export type PersistentProject = {
  id: string;
  name: string;
  product: string;
  productProfileId?: number;
  market: string;
  platform: string;
  language: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  progress?: number;
  owner?: string;
  assets: ProjectAssetBundle;
};

export type ProjectWorkspaceSnapshot = {
  activeView: ActiveView;
  currentProjectId: string | null;
  workspaceByProject?: Record<string, ProjectWorkspaceState>;
  // Legacy global fields remain readable for the selected project only.
  form?: Record<string, string>;
  currentScript?: unknown;
  raceResults?: unknown[];
  referenceScript?: string;
  directorContext?: { duration: number; offer: string; sourceType: string };
};

export type ProjectWorkspaceState = {
  form?: Record<string, string>;
  selectedScriptRevisionId?: string;
  referenceScript?: string;
  directorContext?: { duration: number; offer: string; sourceType: string };
};

export type ResolvedProjectWorkspace = ProjectWorkspaceState & {
  legacyCurrentScript?: unknown;
  legacyRaceResults?: unknown[];
};

export type ProjectMemory = {
  version: 1;
  projects: PersistentProject[];
  workspace: ProjectWorkspaceSnapshot;
  memoryRevision?: number;
  writerId?: string;
  updatedAt: string;
};

export type NormalizedProjectMemory = ProjectMemory & {
  memoryRevision: number;
  writerId: string;
};

export type ProjectMemoryResolution = {
  memory: NormalizedProjectMemory;
  source: "local" | "remote" | "initial";
  conflict: boolean;
  localRevision: number | null;
  remoteRevision: number | null;
  localWriterId: string | null;
  remoteWriterId: string | null;
};

export type ProjectMemoryWriteDecision =
  | { ok: true; status: "accepted" | "idempotent" }
  | { ok: false; status: "stale" | "conflict" | "invalid"; reason: string };

export type ProjectMemoryHydrationState = "uninitialized" | "hydrating" | "ready" | "failed";

export function shouldPersistProjectMemory(
  state: ProjectMemoryHydrationState,
  memory: ProjectMemory,
  hydratedMemory: ProjectMemory | null,
) {
  return state === "ready" && memory !== hydratedMemory;
}

function isProjectMemory(value: unknown): value is ProjectMemory {
  if (!value || typeof value !== "object") return false;
  const memory = value as Partial<ProjectMemory>;
  return memory.version === PROJECT_MEMORY_VERSION && Array.isArray(memory.projects) && Boolean(memory.workspace);
}

export function normalizeProjectMemory(memory: ProjectMemory): NormalizedProjectMemory {
  const revision = Number(memory.memoryRevision);
  return {
    ...memory,
    memoryRevision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0,
    writerId: typeof memory.writerId === "string" && memory.writerId.trim() ? memory.writerId : LEGACY_MEMORY_WRITER,
    updatedAt: typeof memory.updatedAt === "string" && memory.updatedAt ? memory.updatedAt : "legacy/unknown",
  };
}

function canonicalMemoryValue(memory: ProjectMemory) {
  const { memoryRevision: _revision, writerId: _writer, updatedAt: _updatedAt, ...canonical } = memory;
  void _revision; void _writer; void _updatedAt;
  return canonical;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

export function sameProjectMemoryContent(left: ProjectMemory, right: ProjectMemory) {
  return JSON.stringify(stableValue(canonicalMemoryValue(left))) === JSON.stringify(stableValue(canonicalMemoryValue(right)));
}

export function resolveProjectMemoryState(
  local: ProjectMemory | null | undefined,
  remote: ProjectMemory | null | undefined,
  initial: ProjectMemory,
): ProjectMemoryResolution {
  const validLocal = isProjectMemory(local) ? normalizeProjectMemory(local) : null;
  const validRemote = isProjectMemory(remote) ? normalizeProjectMemory(remote) : null;
  const fallback = normalizeProjectMemory(initial);
  const diagnostics = {
    localRevision: validLocal?.memoryRevision ?? null,
    remoteRevision: validRemote?.memoryRevision ?? null,
    localWriterId: validLocal?.writerId ?? null,
    remoteWriterId: validRemote?.writerId ?? null,
  };
  if (!validLocal && !validRemote) return { memory: fallback, source: "initial", conflict: false, ...diagnostics };
  if (validLocal && !validRemote) return { memory: validLocal, source: "local", conflict: false, ...diagnostics };
  if (!validLocal && validRemote) return { memory: validRemote, source: "remote", conflict: false, ...diagnostics };
  if (validLocal!.memoryRevision > validRemote!.memoryRevision) return { memory: validLocal!, source: "local", conflict: false, ...diagnostics };
  if (validRemote!.memoryRevision > validLocal!.memoryRevision) return { memory: validRemote!, source: "remote", conflict: false, ...diagnostics };
  if (sameProjectMemoryContent(validLocal!, validRemote!)) return { memory: validRemote!, source: "remote", conflict: false, ...diagnostics };
  return { memory: validLocal!, source: "local", conflict: true, ...diagnostics };
}

export function mutateProjectMemory(
  current: ProjectMemory,
  writerId: string,
  mutation: (memory: NormalizedProjectMemory) => ProjectMemory,
  now = new Date().toISOString(),
) {
  const normalized = normalizeProjectMemory(current);
  const candidate = normalizeProjectMemory(mutation(normalized));
  if (sameProjectMemoryContent(normalized, candidate)) return current;
  return { ...candidate, memoryRevision: normalized.memoryRevision + 1, writerId, updatedAt: now } satisfies NormalizedProjectMemory;
}

export function validateProjectMemoryWrite(
  current: ProjectMemory | null,
  incoming: ProjectMemory,
  expectedRemoteRevision: number | null,
): ProjectMemoryWriteDecision {
  if (!isProjectMemory(incoming) || !Number.isSafeInteger(incoming.memoryRevision) || Number(incoming.memoryRevision) < 0 || !incoming.writerId?.trim()) {
    return { ok: false, status: "invalid", reason: "Project Memory persistence metadata is invalid" };
  }
  const next = normalizeProjectMemory(incoming);
  if (!current) {
    return expectedRemoteRevision === null || expectedRemoteRevision === 0
      ? { ok: true, status: "accepted" }
      : { ok: false, status: "conflict", reason: "Remote Project Memory does not match the expected revision" };
  }
  const stored = normalizeProjectMemory(current);
  if (next.memoryRevision < stored.memoryRevision) return { ok: false, status: "stale", reason: "Incoming Project Memory revision is stale" };
  if (next.memoryRevision === stored.memoryRevision) {
    return sameProjectMemoryContent(next, stored)
      ? { ok: true, status: "idempotent" }
      : { ok: false, status: "conflict", reason: "Equal Project Memory revisions contain different canonical content" };
  }
  return expectedRemoteRevision === stored.memoryRevision
    ? { ok: true, status: "accepted" }
    : { ok: false, status: "conflict", reason: "Remote Project Memory changed after hydration" };
}

export function getOrCreateProjectMemoryWriterId() {
  if (typeof window === "undefined") return LEGACY_MEMORY_WRITER;
  const current = localStorage.getItem(PROJECT_MEMORY_WRITER_KEY)?.trim();
  if (current) return current;
  const writerId = globalThis.crypto.randomUUID();
  localStorage.setItem(PROJECT_MEMORY_WRITER_KEY, writerId);
  return writerId;
}

export function readProjectMemory(): ProjectMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECT_MEMORY_KEY) || "null") as ProjectMemory | null;
    return isProjectMemory(parsed) ? normalizeProjectMemory(parsed) : null;
  } catch {
    return null;
  }
}

export function cacheProjectMemory(memory: ProjectMemory) {
  if (typeof window !== "undefined") localStorage.setItem(PROJECT_MEMORY_KEY, JSON.stringify(memory));
}

function legacySelectedScriptRevisionId(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const script = value as { revisionId?: unknown; id?: unknown; title?: unknown; product?: unknown; narration?: unknown };
  if (typeof script.revisionId === "string" && script.revisionId.trim()) return script.revisionId.trim();
  if (script.id !== undefined && script.id !== null && String(script.id).trim()) return `legacy-script:${String(script.id).trim()}`;
  if (typeof script.title === "string" && typeof script.narration === "string") return `legacy-copy:${script.title}|${typeof script.product === "string" ? script.product : ""}|${script.narration}`;
  return undefined;
}

export function resolveProjectWorkspace(memory: ProjectMemory, projectId: string | null): ResolvedProjectWorkspace {
  if (!projectId) return {};
  const scoped = memory.workspace.workspaceByProject?.[projectId];
  if (scoped) return scoped;
  if (memory.workspace.currentProjectId !== projectId) return {};
  return {
    form: memory.workspace.form,
    selectedScriptRevisionId: legacySelectedScriptRevisionId(memory.workspace.currentScript),
    referenceScript: memory.workspace.referenceScript,
    directorContext: memory.workspace.directorContext,
    legacyCurrentScript: memory.workspace.currentScript,
    legacyRaceResults: memory.workspace.raceResults,
  };
}

export function cloneProjectWorkspace(memory: ProjectMemory, sourceProjectId: string, targetProjectId: string): ProjectMemory {
  const source = resolveProjectWorkspace(memory, sourceProjectId);
  return updateProjectWorkspace(memory, targetProjectId, {
    form: source.form ? { ...source.form } : undefined,
    selectedScriptRevisionId: source.selectedScriptRevisionId,
    referenceScript: source.referenceScript,
    directorContext: source.directorContext ? { ...source.directorContext } : undefined,
  });
}

export function updateProjectWorkspace(
  memory: ProjectMemory,
  projectId: string,
  patch: Partial<ProjectWorkspaceState>,
): ProjectMemory {
  const current = resolveProjectWorkspace(memory, projectId);
  const { legacyCurrentScript: _legacyScript, legacyRaceResults: _legacyRace, ...state } = current;
  void _legacyScript; void _legacyRace;
  return {
    ...memory,
    workspace: {
      ...memory.workspace,
      workspaceByProject: {
        ...memory.workspace.workspaceByProject,
        [projectId]: { ...state, ...patch },
      },
    },
  };
}

export function removeProjectWorkspace(memory: ProjectMemory, projectId: string): ProjectMemory {
  if (!memory.workspace.workspaceByProject?.[projectId]) return memory;
  const workspaceByProject = { ...memory.workspace.workspaceByProject };
  delete workspaceByProject[projectId];
  return { ...memory, workspace: { ...memory.workspace, workspaceByProject } };
}

export function touchProject(project: PersistentProject, patch: Partial<PersistentProject>): PersistentProject {
  return { ...project, ...patch, assets: patch.assets ?? project.assets, updatedAt: new Date().toISOString() };
}
