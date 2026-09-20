import type { ReactNode } from "react";
import WorkspaceFeedback from "../ui/workspace-feedback";

export default function AppShell({ sidebar, header, workflow, children, className="" }: { sidebar: ReactNode; header: ReactNode; workflow?: ReactNode; children: ReactNode; className?:string }) {
  return <main className={`os-app-shell os-vf-app-shell ${className}`}>
    {sidebar}
    <section className="os-vf-app-main">
      {header}
      {workflow}
      <section className="os-workspace os-vf-workspace">{children}</section>
    </section>
    <WorkspaceFeedback />
  </main>;
}
