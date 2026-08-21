import type { ReactNode } from "react";

export function Tabs({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`vf-tabs ${className}`.trim()}>{children}</div>; }
export function Tab({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) { return <button type="button" className={active ? "is-active" : ""} onClick={onClick}>{children}</button>; }
