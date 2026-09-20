import type { ReactNode } from "react";
import type { WorkspaceShot } from "../../director-workspace";
import { WorkspaceMain } from "../workspace/workspace";

export default function DirectorWorkspace({ shots, selected, onSelect, onReorder, preview, children, inspector, brief }: {
  shots: WorkspaceShot[]; selected: number | null; onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void; preview: (shot: WorkspaceShot) => ReactNode;
  children: ReactNode; inspector: ReactNode; brief: ReactNode;
}) {
  return <WorkspaceMain inspector={inspector} rail={<><h3>Shot 分镜</h3>{shots.map((shot, index) => <button className="creative-shot-choice" key={shot.shotId} aria-pressed={index === selected} draggable onDragStart={event => event.dataTransfer.setData("text/x-shot-index", String(index))} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const value = event.dataTransfer.getData("text/x-shot-index"); if (/^\d+$/.test(value)) onReorder(Number(value), index); }} onClick={() => onSelect(index)}>{preview(shot)}<span><b>Shot {String(index + 1).padStart(2, "0")}</b><small>{shot.startTime}–{shot.endTime}s · {shot.status}</small><span>{shot.visualDescription}</span></span></button>)}<details className="creative-section"><summary>导演策略与完整性</summary>{brief}</details></>}>{children}</WorkspaceMain>;
}
