import type { ReactNode } from "react";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ai" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <span className={`vf-badge vf-badge-${tone}`}>{children}</span>;
}
