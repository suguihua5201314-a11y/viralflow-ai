import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={`vf-card ${className}`.trim()} {...props}>{children}</section>;
}
