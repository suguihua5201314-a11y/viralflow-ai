import type { ReactNode } from "react";

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`vf-field ${className}`.trim()}><span>{label}</span>{children}{error ? <small className="vf-field-error">{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}
