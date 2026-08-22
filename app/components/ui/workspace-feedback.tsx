"use client";

import { useEffect, useState } from "react";

export type WorkspaceNotice = { message: string; detail?: string; tone?: "success" | "error" | "info" };
const eventName = "viralflow:notice";

export function notifyWorkspace(message: string, options: Omit<WorkspaceNotice, "message"> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WorkspaceNotice>(eventName, { detail: { message, tone: "success", ...options } }));
}

export default function WorkspaceFeedback() {
  const [items, setItems] = useState<Array<WorkspaceNotice & { id: number }>>([]);
  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceNotice>).detail;
      const id = Date.now() + Math.random();
      setItems(current => [...current.slice(-2), { ...detail, id }]);
      window.setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 3200);
    };
    window.addEventListener(eventName, onNotice);
    return () => window.removeEventListener(eventName, onNotice);
  }, []);
  return <div className="workspace-toast-region" aria-live="polite" aria-label="操作反馈">{items.map(item => <article key={item.id} className={`workspace-toast ${item.tone || "success"}`}>
    <i aria-hidden="true">{item.tone === "error" ? "!" : item.tone === "info" ? "i" : "✓"}</i>
    <div><b>{item.message}</b>{item.detail ? <span>{item.detail}</span> : null}</div>
    <button type="button" aria-label="关闭提示" onClick={() => setItems(current => current.filter(value => value.id !== item.id))}>×</button>
  </article>)}</div>;
}

