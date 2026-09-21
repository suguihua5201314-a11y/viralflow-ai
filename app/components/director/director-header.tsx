type DirectorHeaderProps = {
  project: string;
  market: string;
  platform: string;
  shotCount: number;
  plannedDuration: number;
  selectedShot: number | null;
  busy: boolean;
  saved: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
  onSave: () => void;
  onRebalance: () => void;
  onConfirm: () => void;
  onFramePrompt: () => void;
};

export default function DirectorHeader({
  project,
  market,
  platform,
  shotCount,
  plannedDuration,
  selectedShot,
  busy,
  saved,
  canRegenerate,
  onRegenerate,
  onSave,
  onRebalance,
  onConfirm,
  onFramePrompt,
}: DirectorHeaderProps) {
  return (
    <header className="vnext-director-header">
      <div className="vnext-director-heading">
        <span>AI STORYBOARD DIRECTOR</span>
        <h1>AI 分镜导演</h1>
        <p>把脚本拆成可执行镜头、动作和视觉证明</p>
        <div>
          <b>{project || "当前项目"}</b>
          <span>
            {market || "目标市场"} · {platform || "TikTok"}
          </span>
        </div>
      </div>
      <div className="vnext-director-header-actions">
        <div className="vnext-director-meta">
          <span>{shotCount} 镜头</span>
          <span>{plannedDuration.toFixed(1)} 秒</span>
          <span>
            {selectedShot === null
              ? "未选择镜头"
              : `当前 Shot ${String(selectedShot + 1).padStart(2, "0")}`}
          </span>
          <small>{saved ? "✓ 已保存" : "编辑中"}</small>
        </div>
        <nav aria-label="导演工作区操作">
          <button
            type="button"
            className="vf-button vf-button-secondary"
            disabled={selectedShot === null}
            onClick={onFramePrompt}
          >
            生成画面提示词 →
          </button>
          <button
            type="button"
            className="vf-button vf-button-secondary"
            disabled={!shotCount}
            onClick={onSave}
          >
            保存导演版本
          </button>
          <details>
            <summary aria-label="更多导演操作">•••</summary>
            <div>
              <button type="button" disabled={!shotCount} onClick={onRebalance}>
                重新平衡时长
              </button>
              <button type="button" disabled={!shotCount} onClick={onConfirm}>
                确认导演分镜
              </button>
            </div>
          </details>
          <button
            type="button"
            className="vf-button vf-button-primary"
            disabled={!canRegenerate || busy}
            aria-busy={busy}
            onClick={onRegenerate}
          >
            {busy
              ? "AI 正在处理…"
              : selectedShot === null
                ? "重做未锁定镜头"
                : "重做当前镜头"}
          </button>
        </nav>
      </div>
    </header>
  );
}
