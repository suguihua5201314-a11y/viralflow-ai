"use client";
import { useState, type ReactNode } from "react";

export default function AssetLibraryWorkspace({ children }: { children: ReactNode }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  return <section className={`creative-library creative-library-${view}`}><div className="creative-toolbar" aria-label="素材显示方式"><button aria-pressed={view === "grid"} onClick={() => setView("grid")}>网格</button><button aria-pressed={view === "list"} onClick={() => setView("list")}>列表</button></div>{children}</section>;
}
