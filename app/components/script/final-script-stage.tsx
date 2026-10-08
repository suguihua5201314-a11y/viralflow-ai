"use client";

import type { CreativeBriefV2 } from "../../creative-contract";
import type { StudioScript } from "../../script-studio";

export type FinalScriptStageStatus = "idle" | "writer" | "critic" | "rewrite" | "complete" | "error";

type Props = {
  brief: CreativeBriefV2 | null;
  script: StudioScript | null;
  status: FinalScriptStageStatus;
  error?: string;
  diagnostic?: string;
  aiSummary?: string;
  rewritten?: boolean;
  onGenerate: () => void;
  onReturnToCreative: () => void;
  onEdit: () => void;
  onAiModify: () => void;
  onDirector: () => void;
};

const progressCopy: Partial<Record<FinalScriptStageStatus, string>> = {
  writer: "正在生成脚本…",
  critic: "正在检查内容…",
  rewrite: "正在优化脚本…",
  complete: "脚本已完成",
};

export function isFinalScriptStageBusy(status: FinalScriptStageStatus) {
  return status === "writer" || status === "critic" || status === "rewrite";
}

export default function FinalScriptStage({ brief, script, status, error, diagnostic, aiSummary, rewritten, onGenerate, onReturnToCreative, onEdit, onAiModify, onDirector }: Props) {
  const busy = isFinalScriptStageBusy(status);
  if (!brief) return <section className="final-script-stage final-script-empty"><span>03 脚本</span><h1>请先确认创意方向</h1><p>脚本会基于已验证的创意方案生成，不需要重新填写商品或市场信息。</p><button className="vf-button vf-button-primary" type="button" onClick={onReturnToCreative}>返回创意</button></section>;
  return <section className="final-script-stage" aria-label="最终脚本" aria-busy={busy}>
    <header className="final-script-hero">
      <div><span>03 脚本</span><h1>最终要拍什么、怎么说</h1><p>系统会基于已确认的创意生成、检查并在需要时自动优化一次。</p></div>
      <button type="button" onClick={onReturnToCreative}>返回修改创意</button>
    </header>
    <section className="final-script-creative-summary" aria-label="当前创意"><span>当前创意</span><strong>{brief.direction.creativeAngle}</strong><p>{brief.opening.hookLine}</p></section>
    {script && busy && <div className="final-script-progress final-script-progress-card" role="status"><i data-step={status}/><span>{progressCopy[status]}</span></div>}
    {!script && <section className="final-script-generate">
      <h2>创意方案已确认</h2><p>一键生成经过内容检查的中文源脚本。</p>
      <button className="vf-button vf-button-primary" type="button" disabled={busy} onClick={onGenerate}>{busy ? progressCopy[status] : "生成高质量脚本"}</button>
      {busy && <div className="final-script-progress" role="status"><i data-step={status}/><span>{progressCopy[status]}</span></div>}
    </section>}
    {status === "error" && <section className="final-script-error" role="alert"><h2>{error || "脚本没有成功生成，请重试。"}</h2><div><button type="button" onClick={onGenerate}>重试</button><button type="button" onClick={onReturnToCreative}>返回创意</button></div>{diagnostic && <details><summary>技术详情</summary><code>{diagnostic}</code></details>}</section>}
    {script && <>
      <section className="final-script-check"><div><span>✓</span><strong>AI 已检查</strong><small>{rewritten ? "已根据检查结果完成一次局部优化" : "脚本已通过检查，无需自动修改"}</small></div><details><summary>查看 AI 检查</summary><p>{aiSummary || "已检查创意一致性、产品事实、表达自然度、合规与可拍摄性。"}</p></details></section>
      <article className="final-script-document">
        <header><span>FINAL SCRIPT</span><h2>{script.title}</h2></header>
        <section><h3>Hook</h3><p>{script.hook}</p></section>
        <div className="final-script-scenes">{script.scenes.map((scene, index)=><section key={`${scene.time}-${index}`}><b>{scene.time}</b><div><small>画面</small><p>{scene.visual}</p><small>动作 / 台词</small><p>{scene.line}</p>{scene.edit && <><small>Evidence / Proof</small><p>{scene.edit}</p></>}</div></section>)}</div>
        <section><h3>完整口播</h3><p>{script.narration}</p></section>
        {script.cta && <section><h3>CTA</h3><p>{script.cta}</p></section>}
      </article>
      <div className="final-script-actions"><button type="button" disabled={busy} onClick={onEdit}>修改</button><button type="button" disabled={busy} onClick={onAiModify}>AI 修改</button><button type="button" disabled={busy} onClick={onGenerate}>{busy ? progressCopy[status] : "重新生成"}</button><button className="vf-button vf-button-primary" type="button" disabled={busy} onClick={onDirector}>确认脚本并进入导演</button></div>
    </>}
  </section>;
}
