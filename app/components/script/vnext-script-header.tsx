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
};

export default function VNextScriptHeader({ product, country, platform, saved, loading, disabled, hasScript, onGenerate, onHistory }: Props) {
  return <header className="vnext-writing-header"><div><span>AI SCRIPT WORKSPACE</span><h1>脚本创作</h1><p>为 {product || "当前产品"} · {country || "目标市场"} {platform} 创作短视频脚本</p></div><nav aria-label="脚本工作区操作"><span className="vnext-save-state">{saved ? "✓ 已保存" : hasScript ? "编辑中" : "等待创作"}</span><details><summary aria-label="更多脚本操作">•••</summary><button type="button" onClick={onHistory}>查看历史脚本</button></details><button type="button" className="vf-button vf-button-primary" disabled={disabled} aria-busy={loading} onClick={onGenerate}>{loading ? "正在生成…" : hasScript ? "重新生成" : "生成脚本"}</button></nav></header>;
}
