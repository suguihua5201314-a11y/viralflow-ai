"use client";

import type { CreativeBriefV2 } from "../../creative-contract";
import type { CreativeDirectionSession } from "../../creative-direction-state";
import type { ScriptWriterAcceptanceState } from "../../script-writer-acceptance";
import type { ScriptCriticAcceptanceState } from "../../script-critic-acceptance";

type Props = {
  session: CreativeDirectionSession;
  currentBrief: CreativeBriefV2 | null;
  disabled: boolean;
  onGenerate: () => void;
  onSelect: (opportunityId: string) => void;
  onContinueToScript: () => void;
  acceptanceEnabled: boolean;
  acceptanceActive: boolean;
  onActivateAcceptance: () => void;
  writerAcceptanceEnabled: boolean;
  writerAcceptance: ScriptWriterAcceptanceState;
  onTestWriter: () => void;
  criticAcceptanceEnabled: boolean;
  criticAcceptance: ScriptCriticAcceptanceState;
  onTestCritic: () => void;
};

const evidenceLabels: Record<string, string> = {
  "observable-demonstration": "可观察演示", application: "使用过程", "before-after": "前后对比", sensory: "感官体验",
  "fit-movement": "适配与动作", preparation: "准备过程", reaction: "真实反应", "routine-context": "日常场景",
  comparison: "对照", education: "知识解释", testimonial: "体验证言", "none-required": "无需额外证明",
};

export default function CreativeDirectionWorkspace({ session, currentBrief, disabled, onGenerate, onSelect, onContinueToScript, acceptanceEnabled, acceptanceActive, onActivateAcceptance, writerAcceptanceEnabled, writerAcceptance, onTestWriter, criticAcceptanceEnabled, criticAcceptance, onTestCritic }: Props) {
  const hasDirections = session.directions.length > 0;
  return (
    <section className="creative-direction-workspace" aria-labelledby="creative-direction-title">
      <header>
        <div>
          <span>CREATIVE DIRECTIONS</span>
          <h2 id="creative-direction-title">选择一个创意方向</h2>
          <p>比较 Hook、开场画面和使用时刻，然后选择最值得拍的方案。</p>
        </div>
        <button className={`vf-button ${hasDirections ? "vf-button-secondary" : "vf-button-primary"}`} disabled={disabled || session.status === "loading"} onClick={onGenerate}>
          {session.status === "loading" ? "正在生成方向…" : hasDirections ? "换一批创意" : "生成创意方向"}
        </button>
      </header>

      {acceptanceEnabled && <details className="creative-preview-diagnostics"><summary>Preview 验收工具</summary><div className="creative-direction-notice"><button className="vf-button" disabled={acceptanceActive || session.status === "loading"} onClick={onActivateAcceptance}>{acceptanceActive ? "L3A 验收产品已绑定" : "绑定 L3A 验收产品"}</button>{acceptanceActive && <small>Transformers Screen Protector · Spain · TikTok · 中文创作源</small>}</div></details>}

      {session.status === "loading" && <div className="creative-direction-notice is-loading" role="status">正在分析产品事实并构建不同创意方向…</div>}
      {session.status === "partial" && <div className="creative-direction-notice">部分方向生成未完成，以下方向仍可使用，也可以重新生成。</div>}
      {session.status === "error" && <div className="creative-direction-notice is-error" role="alert">{session.error || "创意方向生成失败，请重试。"}</div>}

      {hasDirections ? (
        <div className="creative-direction-grid">
          {session.directions.map((canonical, index) => {
            const item = canonical.value;
            const selected = session.selectedOpportunityId
              ? session.selectedOpportunityId === canonical.id
              : currentBrief?.opportunityReference?.canonicalOpportunityId === canonical.id;
            const selecting = session.selectingOpportunityId === canonical.id;
            return (
              <article className={selected ? "is-selected" : ""} key={canonical.id}>
                <div className="creative-direction-card-label"><span>DIRECTION {String(index + 1).padStart(2, "0")}</span>{selected && <b>已选择</b>}</div>
                <h3>{item.creativeAngle}</h3>
                <blockquote>{item.hookLine}</blockquote>
                <dl>
                  <div><dt>开场画面</dt><dd>{item.openingVisual.subject} · {item.openingVisual.action}{item.openingVisual.visibleChangeOrQuestion ? ` · ${item.openingVisual.visibleChangeOrQuestion}` : ""}</dd></div>
                  <div><dt>使用时刻</dt><dd>{item.useMoment}</dd></div>
                  {item.rationale && <div><dt>为什么值得拍</dt><dd>{item.rationale}</dd></div>}
                </dl>
                <details>
                  <summary>查看方向细节</summary>
                  <p><b>目标观众</b>{item.targetAudience}</p>
                  <p><b>核心动机</b>{item.coreMotivation}</p>
                  {item.coreTension && <p><b>张力 / 顾虑</b>{item.coreTension}</p>}
                  <p><b>内容机制</b>{item.contentMechanism}</p>
                </details>
                <button disabled={disabled || Boolean(session.selectingOpportunityId)} onClick={() => onSelect(canonical.id)}>
                  {selecting ? "正在生成完整创意简报…" : session.briefStatus === "error" && session.selectedOpportunityId === canonical.id ? "重试生成简报" : "使用这个方向"}
                </button>
                {session.briefStatus === "error" && session.selectedOpportunityId === canonical.id && <div className="creative-direction-notice is-error" role="alert"><p>创意方案没有成功生成，我们已经保留你选择的方向。</p><span>可以重试当前方向，或选择另一张卡片。</span>{(session.briefDiagnostic || session.briefRuleFamily) && <details><summary>技术详情</summary>{session.briefDiagnostic && <small>Validation: {session.briefDiagnostic}</small>}{session.briefRuleFamily && <small>Rule family: {session.briefRuleFamily}</small>}</details>}</div>}
              </article>
            );
          })}
        </div>
      ) : session.status !== "loading" ? (
        <div className="creative-direction-empty"><strong>创意方向</strong><span>先生成不同内容方向，再选择一个进入后续脚本创作。</span></div>
      ) : null}

      {currentBrief && (!session.selectedOpportunityId || currentBrief.opportunityReference?.canonicalOpportunityId === session.selectedOpportunityId) && (
        <aside className="current-creative-brief">
          <div className="creative-confirmed"><div><span>创意方案已确认</span><b>{currentBrief.direction.creativeAngle}</b></div><button className="vf-button vf-button-primary" onClick={onContinueToScript}>根据此创意生成脚本 →</button></div>
          <details className="creative-brief-details"><summary>查看创意依据</summary><dl>
            <div><dt>目标观众</dt><dd>{currentBrief.opportunity.targetAudience}</dd></div>
            <div><dt>使用时刻</dt><dd>{currentBrief.opportunity.useMoment}</dd></div>
            <div><dt>购买动机 / 张力</dt><dd>{currentBrief.opportunity.purchaseMotivation} · {currentBrief.opportunity.tensionOrObjection}</dd></div>
            <div><dt>内容机制</dt><dd>{currentBrief.direction.contentMechanisms.join(" · ")}</dd></div>
            <div><dt>Hook</dt><dd>{currentBrief.opening.hookLine}</dd></div>
            <div><dt>开场画面</dt><dd>{currentBrief.opening.visual.subject} · {currentBrief.opening.visual.action}</dd></div>
            <div><dt>证明方式</dt><dd>{evidenceLabels[currentBrief.evidence.type] || currentBrief.evidence.type} · {currentBrief.evidence.objective}</dd></div>
            <div><dt>CTA方向</dt><dd>{currentBrief.ctaDirection}</dd></div>
            <div><dt>风险边界</dt><dd>{[...currentBrief.riskBoundaries.prohibitedClaims, ...currentBrief.riskBoundaries.requiredQualifiers, ...currentBrief.riskBoundaries.safetyConstraints].slice(0, 3).join("；") || "遵循产品事实与平台规范"}</dd></div>
          </dl></details>
          {writerAcceptanceEnabled && <details className="creative-preview-diagnostics"><summary>高级诊断工具</summary>
          {writerAcceptanceEnabled && (
            <section className="script-writer-acceptance" aria-label="Brief Writer Preview Acceptance">
              <header><b>Preview Writer Acceptance</b><button disabled={writerAcceptance.status === "loading"} onClick={onTestWriter}>{writerAcceptance.status === "loading" ? "正在测试 Writer…" : "测试 Brief Writer"}</button></header>
              {writerAcceptance.status === "error" && <div className="creative-direction-notice is-error" role="alert"><p>{writerAcceptance.error || "脚本生成失败，请重试。"}</p>{writerAcceptance.diagnostic && <small>Validation: {writerAcceptance.diagnostic}</small>}</div>}
              {writerAcceptance.status === "success" && writerAcceptance.draft && <div className="script-writer-acceptance-result">
                <strong>Writer Success</strong>
                <h3>{writerAcceptance.draft.title}</h3>
                <p><b>Hook</b>{writerAcceptance.draft.hook.line}</p>
                <ol>{writerAcceptance.draft.scenes.map(scene => <li key={scene.id}><b>{scene.purpose}</b><span>{scene.visual}</span><span>{scene.dialogue}</span></li>)}</ol>
                <p><b>Narration</b>{writerAcceptance.draft.fullNarration}</p>
                <p><b>CTA</b>{writerAcceptance.draft.cta}</p>
                <small>{writerAcceptance.metadata?.providerUsed || "unknown"} · {writerAcceptance.metadata?.model || "model unavailable"} · {writerAcceptance.metadata?.latencyMs ?? 0}ms · repair {writerAcceptance.metadata?.repairAttempted ? "yes" : "no"}</small>
              </div>}
              {criticAcceptanceEnabled && writerAcceptance.status === "success" && writerAcceptance.draft && (
                <section className="script-critic-acceptance" aria-label="Script Critic Preview Acceptance">
                  <header><b>Preview Script Critic Acceptance</b><button disabled={criticAcceptance.status === "loading"} onClick={onTestCritic}>{criticAcceptance.status === "loading" ? "正在测试 Critic…" : "测试 Script Critic"}</button></header>
                  {criticAcceptance.status === "error" && <div className="creative-direction-notice is-error" role="alert"><p>{criticAcceptance.error || "脚本评审失败，请重试。"}</p>{criticAcceptance.diagnostic && <small>Validation: {criticAcceptance.diagnostic}</small>}</div>}
                  {criticAcceptance.status === "success" && criticAcceptance.critique && <div className="script-critic-acceptance-result">
                    <strong>Critic Result</strong>
                    <h3>{criticAcceptance.critique.verdict === "pass" ? "PASS" : "NEEDS REWRITE"}</h3>
                    {criticAcceptance.critique.summary && <p>{criticAcceptance.critique.summary}</p>}
                    {criticAcceptance.critique.issues.length > 0 ? <ol>{criticAcceptance.critique.issues.map((issue,index)=><li key={`${issue.code}-${issue.target.scope}-${issue.target.sceneId||"root"}-${index}`}>
                      <b>{issue.severity.toUpperCase()} · {issue.code}</b>
                      <span>Target: {issue.target.scope}{issue.target.sceneId?` · ${issue.target.sceneId}`:""}{issue.target.field?` · ${issue.target.field}`:""}</span>
                      <span>{issue.message}</span>
                      <span>Rewrite: {issue.rewriteInstruction}</span>
                      {issue.briefField && <span>Brief: {issue.briefField}</span>}
                    </li>)}</ol>:<p>No actionable issues returned.</p>}
                    <small>{criticAcceptance.metadata?.providerUsed || "unknown"} · {criticAcceptance.metadata?.model || "model unavailable"} · {criticAcceptance.metadata?.latencyMs ?? 0}ms · repair {criticAcceptance.metadata?.repairAttempted ? "yes" : "no"}</small>
                  </div>}
                </section>
              )}
            </section>
          )}
          </details>}
        </aside>
      )}
    </section>
  );
}
