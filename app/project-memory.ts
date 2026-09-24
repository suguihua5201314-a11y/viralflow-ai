import type { ActiveView } from "./navigation";
import type { FramePromptOverride } from "./frame-prompt-overrides";
import type { CreativeBriefV2 } from "./creative-contract";

export const PROJECT_MEMORY_KEY = "viralflow-project-memory-v1";
export const PROJECT_MEMORY_VERSION = 1;

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
  form?: Record<string, string>;
  currentScript?: unknown;
  raceResults?: unknown[];
  referenceScript?: string;
  directorContext?: { duration: number; offer: string; sourceType: string };
};

export type ProjectMemory = {
  version: 1;
  projects: PersistentProject[];
  workspace: ProjectWorkspaceSnapshot;
  updatedAt: string;
};

export function readProjectMemory(): ProjectMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECT_MEMORY_KEY) || "null") as ProjectMemory | null;
    return parsed?.version === PROJECT_MEMORY_VERSION && Array.isArray(parsed.projects) ? parsed : null;
  } catch {
    return null;
  }
}

export function cacheProjectMemory(memory: ProjectMemory) {
  if (typeof window !== "undefined") localStorage.setItem(PROJECT_MEMORY_KEY, JSON.stringify(memory));
}

export function touchProject(project: PersistentProject, patch: Partial<PersistentProject>): PersistentProject {
  return { ...project, ...patch, assets: patch.assets ?? project.assets, updatedAt: new Date().toISOString() };
}
