"use client";

import { useId, useState, type ReactNode } from "react";

export function WorkspaceShell({ children, kind }: { children: ReactNode; kind: string }) {
  return <section className={`creative-workspace creative-${kind}`}>{children}</section>;
}
export function WorkspaceHeader({ title, context, actions }: { title: string; context?: ReactNode; actions?: ReactNode }) {
  return <header className="creative-header"><div><h2>{title}</h2>{context && <p>{context}</p>}</div>{actions}</header>;
}
export function WorkspaceMain({ children, rail, inspector }: { children: ReactNode; rail?: ReactNode; inspector?: ReactNode }) {
  return <div className={`creative-layout ${rail ? "has-rail" : ""}`}>{rail && <nav className="creative-rail" aria-label="分镜列表">{rail}</nav>}<div className="creative-main">{children}</div>{inspector}</div>;
}
export function Inspector({ children, title = "创作检查器" }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="creative-inspector-slot"><button className="creative-inspector-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? "关闭" : "打开"}{title}</button><aside id={id} className={`creative-inspector ${open ? "is-open" : ""}`} aria-label={title}><h3>{title}</h3>{children}</aside></div>;
}
export function InspectorSection({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="creative-section" open={open}><summary>{title}</summary><div>{children}</div></details>;
}
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="creative-empty"><h3>{title}</h3><div>{children}</div>{action}</div>;
}
export function VersionRail({ children }: { children: ReactNode }) {
  return <nav className="creative-versions" aria-label="版本">{children}</nav>;
}
