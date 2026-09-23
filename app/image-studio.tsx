"use client";

import type { ActiveView } from "./navigation";
import ProjectAssetWorkspace from "./project-asset-workspace";
import type { ImageReturnContext } from "./image-assets";

type ProjectOption = { id: string; name: string; product: string };

export default function ImageStudio({ projects, currentProjectId, onNavigate, onReturnToFrame }: { projects: ProjectOption[]; currentProjectId: string | null; onNavigate: (view: ActiveView) => void; onReturnToFrame: (context: ImageReturnContext) => void }) {
  return <ProjectAssetWorkspace mode="images" projects={projects} currentProjectId={currentProjectId} onNavigate={onNavigate} onReturnToFrame={onReturnToFrame} />;
}
