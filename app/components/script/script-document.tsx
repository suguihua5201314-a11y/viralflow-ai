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
  return <aside className="vnext-proof-block"><SectionHeading eyebrow="PROOF" title="视觉证明"/><div><article><span>Claim</span><p>{script.proof || "暂无独立 Proof 描述"}</p></article><article><span>How to show</span><p>{script.proofMechanism || script.shootingSuggestion || "暂无独立视觉证明描述"}</p></article></div></aside>;
}

function ShotTimeline({ script }: { script: StudioScript }) {
  return <section className="vnext-shot-section"><SectionHeading eyebrow="SHOTS" title="镜头节奏"/><ol className="vnext-shot-timeline">{script.scenes.map((shot, index) => <li key={`${shot.time}-${index}`}><time>{shot.time}</time><div><b>{shot.visual}</b><p>{shot.line}</p>{shot.edit && <details><summary>剪辑提示</summary><small>{shot.edit}</small></details>}</div></li>)}</ol></section>;
}

/** VNext presentation only: every field comes from the existing public Script contract. */
export default function ScriptDocument({ script }: { script: StudioScript }) {
  return <article className="creative-script-document vnext-script-canvas"><header className="vnext-script-canvas-head"><span>{script.style || "KOC / UGC"}</span><p>{script.country} · TikTok · {script.language}</p></header><HookBlock script={script}/><SpokenScript script={script}/><ProofBlock script={script}/><ShotTimeline script={script}/><section className="vnext-cta-block"><SectionHeading eyebrow="CTA" title="行动引导"/><p>{script.cta || "暂无独立 CTA"}</p></section></article>;
}
