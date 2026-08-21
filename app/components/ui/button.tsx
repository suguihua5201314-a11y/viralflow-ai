import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "ai" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }) {
  return <button className={`vf-button vf-button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}
