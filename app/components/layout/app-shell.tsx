import type { ReactNode } from "react";

export default function AppShell({ sidebar, header, children }: { sidebar: ReactNode; header: ReactNode; children: ReactNode }) {
  return <main className="app-shell vf-app-shell">
    {sidebar}
    <section className="vf-app-main">
      {header}
      <section className="workspace vf-workspace">{children}</section>
    </section>
  </main>;
}
