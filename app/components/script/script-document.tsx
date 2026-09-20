import type { StudioScript } from "../../script-studio";

/** Presentation only: no inferred facts, new fields or generated proof. */
export default function ScriptDocument({ script }: { script: StudioScript }) {
  return <article className="creative-script-document"><section className="creative-hook"><h3>Hook</h3><p>{script.hook}</p></section><section><h3>Spoken Script · 完整口播</h3><p>{script.narration}</p></section><section><h3>Proof · 证明设计</h3><p>{script.proof || "暂无独立 Proof 描述"}</p><small>{script.proofMechanism || ""}</small></section><section><h3>Shots · 拍摄时间轴</h3><ol className="creative-shot-timeline">{script.scenes.map((shot, index) => <li key={index}><time>{shot.time}</time><div><b>{shot.visual}</b><p>{shot.line}</p><small>{shot.edit}</small></div></li>)}</ol></section><section><h3>CTA</h3><p>{script.cta || "暂无独立 CTA"}</p></section></article>;
}
