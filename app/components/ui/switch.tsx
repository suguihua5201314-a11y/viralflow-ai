export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} className={`vf-switch ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}><i /><span>{label}</span></button>;
}
