import type { ReactNode } from "react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="vf-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="vf-modal" role="dialog" aria-modal="true" aria-label={title}><button className="vf-modal-close" onClick={onClose}>×</button><h2>{title}</h2>{children}</section></div>;
}
