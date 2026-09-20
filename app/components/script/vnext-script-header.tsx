type Props = {
  product: string;
  country: string;
  platform: string;
  saved: boolean;
  loading: boolean;
  disabled: boolean;
  hasScript: boolean;
  onGenerate: () => void;
  onHistory: () => void;
  onDirector: () => void;
  onCopy: () => void;
  onExport: () => void;
  onCompare: () => void;
  canCompare: boolean;
};

export default function VNextScriptHeader({
  product,
  country,
  platform,
  saved,
  loading,
  disabled,
  hasScript,
  onGenerate,
  onHistory,
  onDirector,
  onCopy,
  onExport,
  onCompare,
  canCompare,
}: Props) {
  return (
    <header className="vnext-writing-header">
      <div>
        <span>AI SCRIPT WORKSPACE</span>
        <h1>脚本创作</h1>
        <p>
          {product || "当前产品"} · {country || "目标市场"} {platform}
        </p>
      </div>
      <nav aria-label="脚本工作区操作">
        <span className="vnext-save-state">
          {saved ? "✓ 已保存" : hasScript ? "编辑中" : "等待创作"}
        </span>
        {hasScript ? (
          <button
            type="button"
            className="vf-button vf-button-secondary"
            onClick={onDirector}
          >
            进入 AI 导演
          </button>
        ) : null}
        <details>
          <summary aria-label="更多脚本操作">•••</summary>
          <div className="vnext-header-menu">
            <button type="button" disabled={!hasScript} onClick={onCopy}>
              复制全文
            </button>
            <button type="button" disabled={!hasScript} onClick={onExport}>
              导出脚本
            </button>
            <button type="button" disabled={!canCompare} onClick={onCompare}>
              版本比较
            </button>
            <button type="button" onClick={onHistory}>
              查看历史脚本
            </button>
          </div>
        </details>
        <button
          type="button"
          className="vf-button vf-button-primary"
          disabled={disabled}
          aria-busy={loading}
          onClick={onGenerate}
        >
          {loading ? "正在生成…" : hasScript ? "重新生成" : "生成脚本"}
        </button>
      </nav>
    </header>
  );
}
