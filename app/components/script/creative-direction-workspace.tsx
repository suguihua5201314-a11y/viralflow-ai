"use client";

import type { CreativeBriefV2 } from "../../creative-contract";
import type { CanonicalCreativeOpportunity } from "../../creative-opportunity-selection";
import type { CreativeDirectionSession } from "../../creative-direction-state";

type Props = {
  session: CreativeDirectionSession;
  currentBrief: CreativeBriefV2 | null;
  disabled: boolean;
  onGenerate: () => void;
  onSelect: (opportunity: CanonicalCreativeOpportunity) => void;
};

const evidenceLabels: Record<string, string> = {
  "observable-demonstration": "可观察演示", application: "使用过程", "before-after": "前后对比", sensory: "感官体验",
  "fit-movement": "适配与动作", preparation: "准备过程", reaction: "真实反应", "routine-context": "日常场景",
  comparison: "对照", education: "知识解释", testimonial: "体验证言", "none-required": "无需额外证明",
};

export default function CreativeDirectionWorkspace({ session, currentBrief, disabled, onGenerate, onSelect }: Props) {
  const hasDirections = session.opportunities.length > 0;
  return (
    <section className="creative-direction-workspace" aria-labelledby="creative-direction-title">
      <header>
        <div>
          <span>CREATIVE DIRECTION</span>
          <h2 id="creative-direction-title">先决定拍什么，再开始写脚本</h2>
          <p>Creative Brain 会根据当前产品、市场和平台提出不同的可拍摄方向。</p>
        </div>
        <button className="vf-button vf-button-primary" disabled={disabled || session.status === "loading"} onClick={onGenerate}>
          {session.status === "loading" ? "正在生成方向…" : hasDirections ? "重新生成方向" : "生成创意方向"}
        </button>
      </header>

      {session.status === "loading" && <div className="creative-direction-notice is-loading" role="status">正在分析产品事实并构建不同创意方向…</div>}
      {session.status === "partial" && <div className="creative-direction-notice">部分方向生成未完成，以下方向仍可使用，也可以重新生成。</div>}
      {session.status === "error" && <div className="creative-direction-notice is-error" role="alert">{session.error || "创意方向生成失败，请重试。"}</div>}

      {hasDirections ? (
        <div className="creative-direction-grid">
          {session.opportunities.map((canonical, index) => {
            const item = canonical.value;
            const selected = session.selectedOpportunityId === canonical.id || currentBrief?.opportunityReference?.canonicalOpportunityId === canonical.id;
            const selecting = session.selectingOpportunityId === canonical.id;
            return (
              <article className={selected ? "is-selected" : ""} key={canonical.id}>
                <div className="creative-direction-card-label"><span>DIRECTION {String(index + 1).padStart(2, "0")}</span>{selected && <b>已选择</b>}</div>
                <h3>{item.creativeAngle}</h3>
                <blockquote>{item.hookLine}</blockquote>
                <dl>
                  <div><dt>开场画面</dt><dd>{item.openingVisual.subject} · {item.openingVisual.action}{item.openingVisual.visibleChangeOrQuestion ? ` · ${item.openingVisual.visibleChangeOrQuestion}` : ""}</dd></div>
                  <div><dt>使用时刻</dt><dd>{item.useMoment}</dd></div>
                  <div><dt>证明方式</dt><dd>{evidenceLabels[item.evidenceStrategy.type] || item.evidenceStrategy.type} · {item.evidenceStrategy.objective}</dd></div>
                  <div><dt>内容机制</dt><dd>{item.contentMechanisms.join(" · ")}</dd></div>
                </dl>
                <details>
                  <summary>查看方向细节</summary>
                  <p><b>目标观众</b>{item.targetAudience}</p>
                  <p><b>购买动机</b>{item.purchaseMotivation}</p>
                  {item.tensionOrObjection && <p><b>张力 / 顾虑</b>{item.tensionOrObjection}</p>}
                  {(item.creatorPersona || item.contentFormat) && <p><b>人物 / 形式</b>{[item.creatorPersona, item.contentFormat].filter(Boolean).join(" · ")}</p>}
                  <p><b>行动方向</b>{item.ctaDirection}</p>
                  {item.riskNotes.length > 0 && <small>注意：{item.riskNotes.join("；")}</small>}
                </details>
                <button disabled={selected || selecting} onClick={() => onSelect(canonical)}>
                  {selecting ? "正在保存…" : selected ? "方向已选择" : "使用这个方向"}
                </button>
                {selected && <small className="creative-direction-saved">Creative Brief 已创建</small>}
              </article>
            );
          })}
        </div>
      ) : session.status !== "loading" ? (
        <div className="creative-direction-empty"><strong>创意方向</strong><span>先生成不同内容方向，再选择一个进入后续脚本创作。</span></div>
      ) : null}

      {currentBrief && (
        <aside className="current-creative-brief">
          <div><span>当前创意方向</span><b>{currentBrief.direction.creativeAngle}</b></div>
          <dl>
            <div><dt>Hook</dt><dd>{currentBrief.opening.hookLine}</dd></div>
            <div><dt>开场画面</dt><dd>{currentBrief.opening.visual.subject} · {currentBrief.opening.visual.action}</dd></div>
            <div><dt>证明方式</dt><dd>{evidenceLabels[currentBrief.evidence.type] || currentBrief.evidence.type} · {currentBrief.evidence.objective}</dd></div>
          </dl>
        </aside>
      )}
    </section>
  );
}
