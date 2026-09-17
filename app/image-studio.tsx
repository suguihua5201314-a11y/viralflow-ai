"use client";

import type { ActiveView } from "./navigation";
import ProjectAssetWorkspace from "./project-asset-workspace";

type ProjectOption = { id: string; name: string; product: string };

export default function ImageStudio({ projects, currentProjectId, onNavigate }: { projects: ProjectOption[]; currentProjectId: string | null; onNavigate: (view: ActiveView) => void }) {
  return <ProjectAssetWorkspace mode="images" projects={projects} currentProjectId={currentProjectId} onNavigate={onNavigate} />;
}
