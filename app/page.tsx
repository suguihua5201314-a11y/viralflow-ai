"use client";

import { useEffect, useMemo, useState } from "react";

type Scene = { time: string; visual: string; line: string; edit: string };
type Script = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: Scene[]; createdAt?: string };
type ImportedHook = { url: string; market: string; hook: string; createdAt: string };
const languages = ["中文", "西班牙语", "意大利语", "德语", "英语"];
const styles = ["强冲突测评", "真实KOC种草", "悬念揭秘", "导演朋友的新玩具", "痛点解决"];
const monitorAccounts = [
  { handle: "@magicjohn.official", market: "全球", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn.official" },
  { handle: "@magicjohn_official.us3", market: "美国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.us3" },
  { handle: "@magicjohn_official.spain", market: "西班牙", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.spain" },
  { handle: "@magic.john.it", market: "意大利", product: "钢化膜", url: "https://www.tiktok.com/@magic.john.it" },
  { handle: "@magicjohn.mex", market: "墨西哥", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn.mex" },
  { handle: "@magicjohn_official.uk", market: "英国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.uk" },
  { handle: "@magicjohn_official.us6", market: "美国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.us6" },
  { handle: "@magicjohn_official.uk5", market: "英国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.uk5" },
];

export default function Home() {
  const [active, setActive] = useState<"create" | "history" | "monitor">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Script[]>([]);
  const [result, setResult] = useState<Script | null>(null);
  const [importForm, setImportForm] = useState({ url: "", market: "西班牙", hook: "" });
  const [importedHooks, setImportedHooks] = useState<ImportedHook[]>([]);
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
      const res = await fetch("/api/scripts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, nonce: Date.now() + Math.random() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(data.script); await loadHistory();
    } catch (e) { setError(e instanceof Error ? e.message : "生成失败，请重试。"); }
    finally { setLoading(false); }
  }
  function update(key: keyof typeof form, value: string) { setForm(prev => ({ ...prev, [key]: value })); }
  function copyText(text: string) { navigator.clipboard.writeText(text); }
  function importHook() {
    if (!importForm.url.trim() || !importForm.hook.trim()) {
      setError("请填写视频链接和前3–5秒开头文案。");
      return;
    }
    setImportedHooks(prev => [{ ...importForm, createdAt: new Date().toISOString() }, ...prev]);
    setImportForm(prev => ({ ...prev, url: "", hook: "" }));
    setError("");
  }
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
      <nav><button className={active === "create" ? "nav-active" : ""} onClick={() => setActive("create")}><span>✦</span> 脚本生成</button><button className={active === "monitor" ? "nav-active" : ""} onClick={() => setActive("monitor")}><span>⌁</span> 爆款监控 <em>{monitorAccounts.length}</em></button><button className={active === "history" ? "nav-active" : ""} onClick={() => { setActive("history"); loadHistory(); }}><span>◷</span> 历史脚本 <em>{history.length}</em></button></nav>
      <div className="sidebar-note"><span>团队创作提示</span><p>先固定产品卖点，每次只更换一种钩子风格，复盘数据会更准确。</p></div>
    </aside>
    <section className="workspace">
      <header><div><p className="eyebrow">TIKTOK COMMERCE STUDIO</p><h1>{active === "create" ? "爆款脚本生成器" : active === "monitor" ? "每日爆款开头监控" : "历史脚本库"}</h1><p>{active === "create" ? "把产品卖点，变成能拍、能剪、能转化的多语言脚本。" : active === "monitor" ? "监控竞品新视频，沉淀前3秒钩子并一键改写。" : "团队生成的脚本会保存在这里，可随时复用与导出。"}</p></div><div className="status"><i /> 团队在线版</div></header>
      {active === "create" ? <div className="creator-grid">
        <section className="panel form-panel">
          <div className="panel-title"><span>01</span><div><h2>填写产品信息</h2><p>信息越具体，脚本越接近可拍状态</p></div></div>
          <label>产品名称<input value={form.product} onChange={e => update("product", e.target.value)} placeholder="例如：自动除尘钢化膜" /></label>
          <label>核心卖点<textarea value={form.sellingPoints} onChange={e => update("sellingPoints", e.target.value)} rows={4} placeholder="用分号隔开，每条尽量具体" /><small>{form.sellingPoints.length}/300</small></label>
          <label>目标用户<input value={form.audience} onChange={e => update("audience", e.target.value)} /></label>
          <div className="two-cols"><label>目标国家<input value={form.country} onChange={e => update("country", e.target.value)} /></label><label>输出语言<select value={form.language} onChange={e => update("language", e.target.value)}>{languages.map(x => <option key={x}>{x}</option>)}</select></label></div>
          <label>内容风格<select value={form.style} onChange={e => update("style", e.target.value)}>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
          <div className="two-cols"><label>视频时长<select value={form.duration} onChange={e => update("duration", e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label><label>促销信息<input value={form.offer} onChange={e => update("offer", e.target.value)} /></label></div>
          {error && <p className="error">{error}</p>}<button className="generate" disabled={!inputReady || loading} onClick={generate}>{loading ? <><b className="spinner" /> 正在生成脚本…</> : <>{result ? "↻ 换一版不同脚本" : "✦ 生成爆款脚本"}</>}</button>
        </section>
        <section className="panel result-panel">{!result ? <div className="empty"><div className="empty-orbit"><span>✦</span></div><h2>你的脚本将在这里生成</h2><p>系统会输出3个钩子、完整口播和逐镜头分镜表，并自动保存到团队历史。</p><div className="empty-tags"><span>3秒钩子</span><span>口播节奏</span><span>拍摄分镜</span><span>转化CTA</span></div></div> : <>
          <div className="result-head"><div><span className="tag">{result.language}</span><span className="tag">{result.style}</span><h2>{result.title}</h2></div><button onClick={() => exportExcel(result)}>⇩ 导出Excel</button></div>
          <article className="hook-card"><div><span>主钩子 · 前3秒</span><button onClick={() => copyText(result.hook)}>复制</button></div><p>{result.hook}</p></article>
          <div className="alt-hooks">{result.alternateHooks.map((h, i) => <button key={h} onClick={() => copyText(h)}><span>备选 {i + 1}</span>{h}</button>)}</div>
          <article className="narration"><div><h3>完整口播</h3><button onClick={() => copyText(result.narration)}>复制全文</button></div><p>{result.narration}</p></article>
          <div className="storyboard"><h3>逐镜头分镜表</h3><div className="scene-head"><span>时间</span><span>画面</span><span>口播 / 字幕</span><span>剪辑</span></div>{result.scenes.map((s, i) => <div className="scene" key={i}><b>{s.time}</b><span>{s.visual}</span><p>{s.line}</p><small>{s.edit}</small></div>)}</div>
        </>}</section>
      </div> : active === "monitor" ? <section className="monitor-panel">
        <div className="monitor-banner"><div><span>采集连接状态</span><h2>8个竞品账号已加入监控</h2><p>账号清单和市场分类已经配置完成。接入第三方TikTok数据接口后，可每天自动同步新视频并提取前3–5秒开头。</p></div><b>接口待连接</b></div>
        <div className="monitor-stats"><article><span>监控账号</span><strong>8</strong><small>6个市场</small></article><article><span>自动采集</span><strong>09:00</strong><small>计划每日执行</small></article><article><span>今日新视频</span><strong>—</strong><small>等待数据接口</small></article><article><span>已沉淀开头</span><strong>{importedHooks.length}</strong><small>本次页面人工导入</small></article></div>
        <div className="monitor-grid"><section className="account-card"><div className="monitor-title"><div><h2>竞品账号清单</h2><p>按市场自动分类，点击可查看TikTok主页</p></div><button>＋ 添加账号</button></div><div className="account-list">{monitorAccounts.map((account, index) => <article key={account.url}><div className="account-avatar">M</div><div><h3>{account.handle}</h3><p><span>{account.market}</span><span>{account.product}</span></p></div><small>{index === 0 ? "主账号" : "监控中"}</small><a href={account.url} target="_blank" rel="noreferrer">打开主页 ↗</a></article>)}</div></section>
        <aside className="import-card"><h2>手动导入新视频</h2><p>自动接口接好前，可以粘贴TikTok视频链接，先建立开头库。</p><label>视频链接<input value={importForm.url} onChange={e => setImportForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://www.tiktok.com/@user/video/..." /></label><label>市场<select value={importForm.market} onChange={e => setImportForm(prev => ({ ...prev, market: e.target.value }))}><option>西班牙</option><option>意大利</option><option>美国</option><option>英国</option><option>墨西哥</option><option>全球</option></select></label><label>开头口播 / 字幕<textarea value={importForm.hook} onChange={e => setImportForm(prev => ({ ...prev, hook: e.target.value }))} rows={4} placeholder="粘贴视频前3–5秒原话" /></label>{error && <p className="error">{error}</p>}<button onClick={importHook}>加入开头库</button><div className="import-note"><b>当前为人工录入</b><span>自动翻译、分类和改写将在数据接口接通后启用</span></div></aside></div>
        <section className="hook-library"><div className="monitor-title"><div><h2>今日爆款开头库</h2><p>仅展示真实采集或人工导入的视频</p></div><div className="hook-filter"><button className="selected">全部市场</button><button>西班牙</button><button>意大利</button><button>美国</button></div></div>{importedHooks.length === 0 ? <div className="monitor-empty"><span>⌁</span><h3>等待第一批视频数据</h3><p>接入采集接口，或在右侧手动导入视频链接和前3秒文案。</p></div> : <div className="hook-list">{importedHooks.map((item, index) => <article key={`${item.createdAt}-${index}`}><div><span>{item.market}</span><small>{new Date(item.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></div><p>{item.hook}</p><a href={item.url} target="_blank" rel="noreferrer">查看原视频 ↗</a></article>)}</div>}</section>
      </section> : <section className="history-panel"><div className="history-top"><div><h2>全部脚本</h2><p>共 {history.length} 条团队脚本</p></div><button onClick={() => setActive("create")}>＋ 新建脚本</button></div>{history.length === 0 ? <div className="history-empty">还没有生成过脚本。</div> : <div className="history-list">{history.map(item => <article key={item.id}><div className="history-icon">{item.product.slice(0, 1)}</div><div className="history-main"><div><span>{item.language}</span><span>{item.style}</span></div><h3>{item.title}</h3><p>{item.hook}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""}</small></div><div className="history-actions"><button onClick={() => { setResult(item); setActive("create"); }}>查看</button><button onClick={() => exportExcel(item)}>Excel</button></div></article>)}</div>}</section>}
    </section>
  </main>;
}
