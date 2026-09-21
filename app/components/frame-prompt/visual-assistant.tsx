import type { DirectorRequest } from "../../director-core";
import type { WorkspaceShot } from "../../director-workspace";
import type { FramePromptBundle } from "../../frame-prompt";

const KeyValue = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value || "—"}</dd>
  </div>
);

export default function VisualAssistant({
  shot,
  request,
  prompts,
}: {
  shot: WorkspaceShot;
  request: DirectorRequest;
  prompts: FramePromptBundle;
}) {
  const suggestions = [
    "尾帧保持与首帧完全相同的机位、构图和光线。",
    shot.cameraMovement === "Static"
      ? "保持固定机位，让产品动作成为画面中唯一主要变化。"
      : `镜头仅执行 ${shot.cameraMovement}，避免额外推拉或跳切。`,
    shot.proofRequirement
      ? "Proof 动作应连续完成，避免剪切破坏可信度。"
      : "当前镜头不增加导演方案之外的新效果证明。",
  ];

  return (
    <aside className="vnext-frame-assistant" aria-label="AI 画面助手">
      <header>
        <span>✦ AI 画面助手</span>
        <h2>当前镜头</h2>
        <b>Shot {String(shot.order).padStart(2, "0")}</b>
      </header>
      <section>
        <h3>当前镜头</h3>
        <dl>
          <KeyValue label="时长" value={`${shot.duration.toFixed(1)} 秒`} />
          <KeyValue label="视觉目标" value={prompts.visualGoal} />
          <KeyValue
            label="台词"
            value={shot.dialogue || shot.voiceover || "无口播"}
          />
          <KeyValue
            label="Proof"
            value={shot.proofRequirement || "无独立 Proof"}
          />
          <KeyValue label="来源" value="AI Director" />
        </dl>
      </section>
      <section>
        <h3>视觉策略</h3>
        <dl>
          <KeyValue label="Visual Style" value={request.context.creativeMode} />
          <KeyValue label="Framing" value={shot.framing} />
          <KeyValue label="Camera" value={shot.cameraAngle} />
          <KeyValue label="Motion" value={shot.cameraMovement} />
          <KeyValue
            label="Proof"
            value={shot.proofRequirement || shot.productAction}
          />
        </dl>
      </section>
      <section className="vnext-frame-suggestions">
        <h3>AI Visual Suggestions</h3>
        <ol>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ol>
      </section>
      <details>
        <summary>一致性</summary>
        <div className="vnext-frame-rule-summary">
          {Object.entries(prompts.consistencyRules).map(([key, rules]) => (
            <section key={key}>
              <b>{key}</b>
              <p>{rules.join("；")}</p>
            </section>
          ))}
        </div>
      </details>
      <details>
        <summary>高级参数</summary>
        <p>比例由平台确定；模型与 Provider 在现有图片创作工作台中选择。</p>
      </details>
    </aside>
  );
}
