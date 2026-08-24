import type { ReactNode } from "react";
import WorkspaceFeedback from "../ui/workspace-feedback";

export default function AppShell({ sidebar, header, children, className="" }: { sidebar: ReactNode; header: ReactNode; children: ReactNode; className?:string }) {
  return <main className={`app-shell vf-app-shell ${className}`}>
    {sidebar}
    <section className="vf-app-main">
      {header}
      <section className="workspace vf-workspace">{children}</section>
    </section>
    <WorkspaceFeedback />
  </main>;
}
