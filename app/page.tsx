"use client";

import { useEffect, useMemo, useState } from "react";

type Scene = { time: string; visual: string; line: string; edit: string };
type Script = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: Scene[]; createdAt?: string };
const languages = ["中文", "西班牙语", "意大利语", "德语", "英语"];
const styles = ["强冲突测评", "真实KOC种草", "悬念揭秘", "导演朋友的新玩具", "痛点解决"];

export default function Home() {
  const [active, setActive] = useState<"create" | "history">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Script[]>([]);
  const [result, setResult] = useState<Script | null>(null);
  const [form, setForm] = useState({ product: "钢化膜", sellingPoints: "10秒自动除尘安装；无气泡、不歪；28°防窥；98%手机壳兼容", audience: "经常自己贴坏钢化膜、在意隐私的手机用户", country: "西班牙", language: "西班牙语", style: "强冲突测评", duration: "45", offer: "限时折扣，库存有限" });
  const inputReady = useMemo(() => form.product.trim() && form.sellingPoints.trim(), [form]);

  async function loadHistory() {
    try { const res = await fetch("/api/scripts", { cache: "no-store" }); const data = await res.json(); if (res.ok) setHistory(data.scripts ?? []); }
    catch { setError("历史记录暂时加载失败，请稍后再试。"); }
  }
  useEffect(() => {
    fetch("/api/scripts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setHistory(data.scripts ?? []))
      .catch(() => setError("历史记录暂时加载失败，请稍后再试。"));
  }, []);

  async function generate() {
    if (!inputReady || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/scripts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(data.script); await loadHistory();
    } catch (e) { setError(e instanceof Error ? e.message : "生成失败，请重试。"); }
    finally { setLoading(false); }
  }
  function update(key: keyof typeof form, value: string) { setForm(prev => ({ ...prev, [key]: value })); }
  function copyText(text: string) { navigator.clipboard.writeText(text); }
  function exportExcel(script: Script) {
    const rows = [["项目", "内容", "画面", "剪辑提示"], ["主钩子", script.hook, "", ""], ["备选钩子", script.alternateHooks.join(" / "), "", ""], ["完整口播", script.narration, "", ""], ...script.scenes.map(s => [s.time, s.line, s.visual, s.edit])];
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="爆款脚本"><Table>${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${script.product}-${script.language}-脚本.xls`; a.click(); URL.revokeObjectURL(a.href);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">V</span><div><strong>ViralCraft</strong><small>爆款脚本工作台</small></div></div>
      <nav><button className={active === "create" ? "nav-active" : ""} onClick={() => setActive("create")}><span>✦</span> 脚本生成</button><button className={active === "history" ? "nav-active" : ""} onClick={() => { setActive("history"); loadHistory(); }}><span>◷</span> 历史脚本 <em>{history.length}</em></button></nav>
      <div className="sidebar-note"><span>团队创作提示</span><p>先固定产品卖点，每次只更换一种钩子风格，复盘数据会更准确。</p></div>
    </aside>
    <section className="workspace">
      <header><div><p className="eyebrow">TIKTOK COMMERCE STUDIO</p><h1>{active === "create" ? "爆款脚本生成器" : "历史脚本库"}</h1><p>{active === "create" ? "把产品卖点，变成能拍、能剪、能转化的多语言脚本。" : "团队生成的脚本会保存在这里，可随时复用与导出。"}</p></div><div className="status"><i /> 团队在线版</div></header>
      {active === "create" ? <div className="creator-grid">
        <section className="panel form-panel">
          <div className="panel-title"><span>01</span><div><h2>填写产品信息</h2><p>信息越具体，脚本越接近可拍状态</p></div></div>
          <label>产品名称<input value={form.product} onChange={e => update("product", e.target.value)} placeholder="例如：自动除尘钢化膜" /></label>
          <label>核心卖点<textarea value={form.sellingPoints} onChange={e => update("sellingPoints", e.target.value)} rows={4} placeholder="用分号隔开，每条尽量具体" /><small>{form.sellingPoints.length}/300</small></label>
          <label>目标用户<input value={form.audience} onChange={e => update("audience", e.target.value)} /></label>
          <div className="two-cols"><label>目标国家<input value={form.country} onChange={e => update("country", e.target.value)} /></label><label>输出语言<select value={form.language} onChange={e => update("language", e.target.value)}>{languages.map(x => <option key={x}>{x}</option>)}</select></label></div>
          <label>内容风格<select value={form.style} onChange={e => update("style", e.target.value)}>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
          <div className="two-cols"><label>视频时长<select value={form.duration} onChange={e => update("duration", e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label><label>促销信息<input value={form.offer} onChange={e => update("offer", e.target.value)} /></label></div>
          {error && <p className="error">{error}</p>}<button className="generate" disabled={!inputReady || loading} onClick={generate}>{loading ? <><b className="spinner" /> 正在生成脚本…</> : <>✦ 生成爆款脚本</>}</button>
        </section>
        <section className="panel result-panel">{!result ? <div className="empty"><div className="empty-orbit"><span>✦</span></div><h2>你的脚本将在这里生成</h2><p>系统会输出3个钩子、完整口播和逐镜头分镜表，并自动保存到团队历史。</p><div className="empty-tags"><span>3秒钩子</span><span>口播节奏</span><span>拍摄分镜</span><span>转化CTA</span></div></div> : <>
          <div className="result-head"><div><span className="tag">{result.language}</span><span className="tag">{result.style}</span><h2>{result.title}</h2></div><button onClick={() => exportExcel(result)}>⇩ 导出Excel</button></div>
          <article className="hook-card"><div><span>主钩子 · 前3秒</span><button onClick={() => copyText(result.hook)}>复制</button></div><p>{result.hook}</p></article>
          <div className="alt-hooks">{result.alternateHooks.map((h, i) => <button key={h} onClick={() => copyText(h)}><span>备选 {i + 1}</span>{h}</button>)}</div>
          <article className="narration"><div><h3>完整口播</h3><button onClick={() => copyText(result.narration)}>复制全文</button></div><p>{result.narration}</p></article>
          <div className="storyboard"><h3>逐镜头分镜表</h3><div className="scene-head"><span>时间</span><span>画面</span><span>口播 / 字幕</span><span>剪辑</span></div>{result.scenes.map((s, i) => <div className="scene" key={i}><b>{s.time}</b><span>{s.visual}</span><p>{s.line}</p><small>{s.edit}</small></div>)}</div>
        </>}</section>
      </div> : <section className="history-panel"><div className="history-top"><div><h2>全部脚本</h2><p>共 {history.length} 条团队脚本</p></div><button onClick={() => setActive("create")}>＋ 新建脚本</button></div>{history.length === 0 ? <div className="history-empty">还没有生成过脚本。</div> : <div className="history-list">{history.map(item => <article key={item.id}><div className="history-icon">{item.product.slice(0, 1)}</div><div className="history-main"><div><span>{item.language}</span><span>{item.style}</span></div><h3>{item.title}</h3><p>{item.hook}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""}</small></div><div className="history-actions"><button onClick={() => { setResult(item); setActive("create"); }}>查看</button><button onClick={() => exportExcel(item)}>Excel</button></div></article>)}</div>}</section>}
    </section>
  </main>;
}
