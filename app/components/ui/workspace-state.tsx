"use client";

import type { ReactNode } from "react";

type Action = { label: string; onClick: () => void; disabled?: boolean };

export default function WorkspaceState({
  kind = "empty",
  icon = "✦",
  eyebrow,
  title,
  description,
  primary,
  secondary,
  detail,
  steps,
  compact = false,
}: {
  kind?: "empty" | "loading" | "error" | "search" | "unavailable" | "success";
  icon?: string;
  eyebrow?: string;
  title: string;
  description: string;
  primary?: Action;
  secondary?: Action;
  detail?: ReactNode;
  steps?: string[];
  compact?: boolean;
}) {
  return <section className={`workspace-state state-${kind}${compact ? " is-compact" : ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "loading" ? "polite" : undefined}>
    <div className="workspace-state-icon" aria-hidden="true">{kind === "loading" ? <i /> : icon}</div>
    {eyebrow ? <span>{eyebrow}</span> : null}
    <h3>{title}</h3>
    <p>{description}</p>
    {kind === "loading" ? <div className="workspace-state-progress" aria-hidden="true"><i /><i /><i /></div> : null}
    {kind === "loading" && steps?.length ? <div className="workspace-processing-steps" aria-label="AI 处理步骤">
      {steps.map((step,index)=><div className={index===0?"is-processing":"is-pending"} key={step}><i aria-hidden="true"/><span>{step}</span><em>{index===0?"处理中":"等待"}</em></div>)}
    </div> : null}
    {detail ? <div className="workspace-state-detail">{detail}</div> : null}
    {primary || secondary ? <div className="workspace-state-actions">
      {secondary ? <button type="button" onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button> : null}
      {primary ? <button type="button" className="primary" onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</button> : null}
    </div> : null}
  </section>;
}
