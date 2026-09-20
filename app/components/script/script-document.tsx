import type { StudioScript } from "../../script-studio";

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <header className="vnext-script-section-heading"><span>{eyebrow}</span><h3>{title}</h3></header>;
}

function HookBlock({ script }: { script: StudioScript }) {
  return <section className="vnext-hook-block"><SectionHeading eyebrow="HOOK" title="开场钩子"/><p>{script.hook}</p></section>;
}

function SpokenScript({ script }: { script: StudioScript }) {
  return <section className="vnext-spoken-script"><SectionHeading eyebrow="SPOKEN SCRIPT" title="口播正文"/><p>{script.narration}</p></section>;
}

function ProofBlock({ script }: { script: StudioScript }) {
  return <section className="vnext-proof-block"><SectionHeading eyebrow="PROOF" title="视觉证明"/><div><article><span>主张</span><p>{script.proof || "暂无独立 Proof 描述"}</p></article><article><span>视觉证明</span><p>{script.proofMechanism || script.shootingSuggestion || "暂无独立视觉证明描述"}</p></article></div></section>;
}

function ShotTimeline({ script }: { script: StudioScript }) {
  return <section className="vnext-shot-section"><SectionHeading eyebrow="SHOTS" title="镜头节奏"/><ol className="vnext-shot-timeline">{script.scenes.map((shot, index) => <li key={`${shot.time}-${index}`}><time>{shot.time}</time><span>{index === 0 ? "Hook" : index === script.scenes.length - 1 ? "CTA" : `Shot ${String(index + 1).padStart(2, "0")}`}</span><div><b>{shot.visual}</b><p>{shot.line}</p>{shot.edit && <small>{shot.edit}</small>}</div></li>)}</ol></section>;
}

/** VNext presentation only: every field comes from the existing public Script contract. */
export default function ScriptDocument({ script }: { script: StudioScript }) {
  return <article className="creative-script-document vnext-script-canvas"><header className="vnext-script-canvas-head"><div><span>AI SCRIPT</span><h2>{script.title || `${script.country} · ${script.style}`}</h2></div><dl><div><dt>语言</dt><dd>{script.language}</dd></div><div><dt>市场</dt><dd>{script.country}</dd></div><div><dt>形式</dt><dd>{script.style}</dd></div></dl></header><HookBlock script={script}/><SpokenScript script={script}/><ProofBlock script={script}/><ShotTimeline script={script}/><section className="vnext-cta-block"><SectionHeading eyebrow="CTA" title="行动引导"/><p>{script.cta || "暂无独立 CTA"}</p></section></article>;
}
