"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveView } from "../../navigation";
import { viewMeta } from "../../navigation";

export type GlobalSearchItem = {
  id: string;
  type: "功能" | "产品" | "案例" | "脚本";
  title: string;
  subtitle: string;
  keywords?: string;
  onSelect: () => void;
};

export default function TopHeader({ active, aiConnected, teamConnected, saveState, searchItems, project }: { active: ActiveView; aiConnected: boolean; teamConnected: boolean; saveState: "saved"|"saving"; searchItems: GlobalSearchItem[]; project?: { name: string; market: string; platform: string; language: string } | null }) {
  const meta = viewMeta[active];
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return searchItems.filter(item => `${item.title} ${item.subtitle} ${item.keywords || ""}`.toLocaleLowerCase().includes(term)).slice(0, 8);
  }, [query, searchItems]);
  const choose = (item: GlobalSearchItem) => { item.onSelect(); setQuery(""); setFocused(false); };
  useEffect(() => {
    const handleCommandSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleCommandSearch);
    return () => window.removeEventListener("keydown", handleCommandSearch);
  }, []);

  return <header className="os-vf-top-header">
    <div className="os-vf-header-title"><span>{meta.eyebrow}</span><div><div className="os-vf-breadcrumb"><b>{project?.name || "ViralFlow AI"}</b><i>›</i><span>{meta.label}</span></div><h1>{meta.label}</h1><p>{project ? <>{project.market}<i>·</i>{project.platform}<i>·</i>{project.language}</> : meta.description}</p></div></div>
    <div className="os-vf-global-search" onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)}>
      <span aria-hidden="true">⌕</span><input ref={searchRef} aria-label="全局搜索" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && results[0]) choose(results[0]); if (event.key === "Escape") { setQuery(""); setFocused(false); } }} placeholder="搜索功能、脚本、产品、案例…" /><kbd>⌘ K</kbd>
      {focused && query.trim() && <div className="os-vf-search-results" role="listbox">
        {results.length ? results.map(item => <button key={item.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}><em>{item.type}</em><div><b>{item.title}</b><small>{item.subtitle}</small></div><span>↗</span></button>) : <p>没有找到匹配的真实内容</p>}
      </div>}
    </div>
    <div className="os-vf-header-actions">
      <div className={`os-vf-global-save ${saveState}`} role="status" aria-live="polite"><i />{saveState==="saving"?"正在保存...":"已保存 ✓"}</div>
      <div className={`os-vf-service-state ${aiConnected ? "is-online" : ""}`}><i />{aiConnected ? "AI 服务正常" : "本地稳定模式"}</div>
      <div className={`os-vf-team-state ${teamConnected ? "is-online" : ""}`}>{teamConnected ? "团队已同步" : "团队未连接"}</div>
      <div className="os-vf-user"><span>VF</span><div><b>苏苏团队</b><small>内容管理</small></div></div>
    </div>
  </header>;
}
