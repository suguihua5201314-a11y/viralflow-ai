"use client";

import { useEffect, useMemo, useState } from "react";
import { frameworkCatalog } from "./frameworks";

type Scene = { time: string; visual: string; line: string; edit: string };
type Script = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: Scene[]; createdAt?: string; aiGenerated?: boolean };
type ImportedHook = { url: string; market: string; hook: string; createdAt: string };
type MonitorAccount = { id?: number; handle: string; market: string; product: string; url: string };
const languages = ["中文", "西班牙语", "意大利语", "德语", "英语"];
const styles = ["强冲突测评", "真实KOC种草", "悬念揭秘", "导演朋友的新玩具", "痛点解决"];
const frameworkGroups = [...new Set(frameworkCatalog.map(item => item.group))];
const initialMonitorAccounts: MonitorAccount[] = [
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
  const [aiConnected, setAiConnected] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Script[]>([]);
  const [result, setResult] = useState<Script | null>(null);
  const [importForm, setImportForm] = useState({ url: "", market: "西班牙", hook: "" });
  const [importedHooks, setImportedHooks] = useState<ImportedHook[]>([]);
  const [monitorAccounts, setMonitorAccounts] = useState<MonitorAccount[]>(initialMonitorAccounts);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountForm, setAccountForm] = useState({ url: "", market: "西班牙", product: "钢化膜" });
  const [form, setForm] = useState({ product: "变形金刚钢化膜", sellingPoints: "10秒自动除尘安装；无气泡、不歪；28°防窥；表层电镀疏水疏油层；抗刮耐磨、抗冲击；贴合紧密、不易翘边", audience: "经常自己贴坏钢化膜、在意隐私的手机用户", country: "西班牙", language: "西班牙语", style: "强冲突测评", framework: "智能随机", duration: "45", offer: "库存有限；买一份到手两张膜；现在下单加赠镜头保护膜" });
  const inputReady = useMemo(() => form.product.trim() && form.sellingPoints.trim(), [form]);

  async function loadHistory() {
    try { const saved = JSON.parse(localStorage.getItem("viralcraft-history") || "[]"); setHistory(saved); const res = await fetch("/api/scripts", { cache: "no-store" }); const data = await res.json(); if (res.ok) setAiConnected(Boolean(data.aiConnected)); }
    catch { setError("历史记录暂时加载失败，请稍后再试。"); }
  }
  useEffect(() => {
    fetch("/api/scripts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setHistory(JSON.parse(localStorage.getItem("viralcraft-history") || "[]")); setAiConnected(Boolean(data.aiConnected)); })
      .catch(() => setError("历史记录暂时加载失败，请稍后再试。"));
    fetch("/api/monitor/accounts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { if (data.accounts) setMonitorAccounts(data.accounts); })
      .catch(() => undefined);
  }, []);

  async function addMonitorAccount() {
    if (accountSaving) return;
    setAccountSaving(true); setAccountError("");
    try {
      const res = await fetch("/api/monitor/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(accountForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "账号添加失败");
      setMonitorAccounts(prev => [...prev, data.account]);
      setAccountForm({ url: "", market: "西班牙", product: "钢化膜" });
      setShowAddAccount(false);
    } catch (e) { setAccountError(e instanceof Error ? e.message : "账号添加失败"); }
    finally { setAccountSaving(false); }
  }

  async function generate() {
    if (!inputReady || loading) return;
    setLoading(true); setError("");
    try {
      const recent = history.filter(item => item.product === form.product && item.language === form.language).slice(0, 8).map(({title,hook,narration}) => ({title,hook,narration}));
      const res = await fetch("/api/scripts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, recent, nonce: Date.now() + Math.random() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      const nextHistory = [data.script, ...history].slice(0, 100); setResult(data.script); setHistory(nextHistory); localStorage.setItem("viralcraft-history", JSON.stringify(nextHistory));
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
          <div className="two-cols"><label>脚本框架<select value={form.framework} onChange={e => update("framework", e.target.value)}><option>智能随机</option>{frameworkGroups.map(group => <optgroup key={group} label={group}>{frameworkCatalog.filter(item => item.group === group).map(item => <option key={item.name}>{item.name}</option>)}</optgroup>)}</select></label><label>表达风格<select value={form.style} onChange={e => update("style", e.target.value)}>{styles.map(x => <option key={x}>{x}</option>)}</select></label></div>
          <div className={`framework-note ${aiConnected ? "ai-ready" : ""}`}><b>{aiConnected ? "Magic John完整脚本引擎已连接" : form.framework === "智能随机" ? "稳定本地模式：自动切换叙事框架" : `当前固定：${form.framework}`}</b><span>{aiConnected ? "V4 Pro会让开头、安装、卖点演示、复测和促单沿用同一条剧情，同时锁住所有必讲卖点。" : "使用经过整理的TikTok转化结构。"}</span></div>
          <div className="two-cols"><label>视频时长<select value={form.duration} onChange={e => update("duration", e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label><label>促销信息<input value={form.offer} onChange={e => update("offer", e.target.value)} /></label></div>
          {error && <p className="error">{error}</p>}<button className="generate" disabled={!inputReady || loading} onClick={generate}>{loading ? <><b className="spinner" /> {aiConnected ? "DeepSeek正在原创…" : "正在生成脚本…"}</> : <>{result ? "↻ 换一版不同脚本" : aiConnected ? "✦ DeepSeek生成原创脚本" : "✦ 生成爆款脚本"}</>}</button>
        </section>
        <section className="panel result-panel">{!result ? <div className="empty"><div className="empty-orbit"><span>✦</span></div><h2>你的脚本将在这里生成</h2><p>系统会输出3个钩子、完整口播和逐镜头分镜表，并自动保存到团队历史。</p><div className="empty-tags"><span>3秒钩子</span><span>口播节奏</span><span>拍摄分镜</span><span>转化CTA</span></div></div> : <>
          <div className="result-head"><div><span className="tag">{result.language}</span><span className="tag">{result.style}</span>{result.aiGenerated && <span className="tag ai-tag">V4 Pro完整脚本</span>}<h2>{result.title}</h2></div><button onClick={() => exportExcel(result)}>⇩ 导出Excel</button></div>
          <article className="hook-card"><div><span>主钩子 · 前3秒</span><button onClick={() => copyText(result.hook)}>复制</button></div><p>{result.hook}</p></article>
          <div className="alt-hooks">{result.alternateHooks.map((h, i) => <button key={h} onClick={() => copyText(h)}><span>备选 {i + 1}</span>{h}</button>)}</div>
          <article className="narration"><div><h3>完整口播</h3><button onClick={() => copyText(result.narration)}>复制全文</button></div><p>{result.narration}</p></article>
          <div className="storyboard"><h3>逐镜头分镜表</h3><div className="scene-head"><span>时间</span><span>画面</span><span>口播 / 字幕</span><span>剪辑</span></div>{result.scenes.map((s, i) => <div className="scene" key={i}><b>{s.time}</b><span>{s.visual}</span><p>{s.line}</p><small>{s.edit}</small></div>)}</div>
        </>}</section>
      </div> : active === "monitor" ? <section className="monitor-panel">
        <div className="monitor-banner"><div><span>采集连接状态</span><h2>{monitorAccounts.length}个竞品账号已加入监控</h2><p>账号清单和市场分类已经保存。配置第三方TikTok数据服务后，才能每天自动同步新视频并提取前3–5秒开头。</p></div><button onClick={() => setShowConnection(true)}>配置采集接口</button></div>
        <div className="monitor-stats"><article><span>监控账号</span><strong>{monitorAccounts.length}</strong><small>{new Set(monitorAccounts.map(x => x.market)).size}个市场</small></article><article><span>自动采集</span><strong>未启用</strong><small>完成接口配置后开启</small></article><article><span>今日新视频</span><strong>—</strong><small>等待数据接口</small></article><article><span>已沉淀开头</span><strong>{importedHooks.length}</strong><small>本次页面人工导入</small></article></div>
        <div className="monitor-grid"><section className="account-card"><div className="monitor-title"><div><h2>竞品账号清单</h2><p>按市场自动分类，新增账号会保存到团队清单</p></div><button onClick={() => { setAccountError(""); setShowAddAccount(true); }}>＋ 添加账号</button></div><div className="account-list">{monitorAccounts.map((account, index) => <article key={account.url}><div className="account-avatar">M</div><div><h3>{account.handle}</h3><p><span>{account.market}</span><span>{account.product}</span></p></div><small>{index === 0 ? "主账号" : "已添加"}</small><a href={account.url} target="_blank" rel="noreferrer">打开主页 ↗</a></article>)}</div></section>
        <aside className="import-card"><h2>手动导入新视频</h2><p>自动接口接好前，可以粘贴TikTok视频链接，先建立开头库。</p><label>视频链接<input value={importForm.url} onChange={e => setImportForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://www.tiktok.com/@user/video/..." /></label><label>市场<select value={importForm.market} onChange={e => setImportForm(prev => ({ ...prev, market: e.target.value }))}><option>西班牙</option><option>意大利</option><option>美国</option><option>英国</option><option>墨西哥</option><option>全球</option></select></label><label>开头口播 / 字幕<textarea value={importForm.hook} onChange={e => setImportForm(prev => ({ ...prev, hook: e.target.value }))} rows={4} placeholder="粘贴视频前3–5秒原话" /></label>{error && <p className="error">{error}</p>}<button onClick={importHook}>加入开头库</button><div className="import-note"><b>当前为人工录入</b><span>自动翻译、分类和改写将在数据接口接通后启用</span></div></aside></div>
        <section className="hook-library"><div className="monitor-title"><div><h2>今日爆款开头库</h2><p>仅展示真实采集或人工导入的视频</p></div><div className="hook-filter"><button className="selected">全部市场</button><button>西班牙</button><button>意大利</button><button>美国</button></div></div>{importedHooks.length === 0 ? <div className="monitor-empty"><span>⌁</span><h3>等待第一批视频数据</h3><p>接入采集接口，或在右侧手动导入视频链接和前3秒文案。</p></div> : <div className="hook-list">{importedHooks.map((item, index) => <article key={`${item.createdAt}-${index}`}><div><span>{item.market}</span><small>{new Date(item.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></div><p>{item.hook}</p><a href={item.url} target="_blank" rel="noreferrer">查看原视频 ↗</a></article>)}</div>}</section>
      </section> : <section className="history-panel"><div className="history-top"><div><h2>全部脚本</h2><p>共 {history.length} 条团队脚本</p></div><button onClick={() => setActive("create")}>＋ 新建脚本</button></div>{history.length === 0 ? <div className="history-empty">还没有生成过脚本。</div> : <div className="history-list">{history.map(item => <article key={item.id}><div className="history-icon">{item.product.slice(0, 1)}</div><div className="history-main"><div><span>{item.language}</span><span>{item.style}</span></div><h3>{item.title}</h3><p>{item.hook}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""}</small></div><div className="history-actions"><button onClick={() => { setResult(item); setActive("create"); }}>查看</button><button onClick={() => exportExcel(item)}>Excel</button></div></article>)}</div>}</section>}
    </section>
    {showAddAccount && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAddAccount(false); }}><section className="monitor-modal" role="dialog" aria-modal="true" aria-labelledby="add-account-title"><button className="modal-close" onClick={() => setShowAddAccount(false)}>×</button><span className="modal-kicker">ADD COMPETITOR</span><h2 id="add-account-title">添加TikTok竞品账号</h2><p>填写账号主页链接，添加后会保存到团队监控清单。</p><label>账号主页链接<input autoFocus value={accountForm.url} onChange={e => setAccountForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://www.tiktok.com/@username" /></label><div className="two-cols"><label>市场<select value={accountForm.market} onChange={e => setAccountForm(prev => ({ ...prev, market: e.target.value }))}><option>全球</option><option>美国</option><option>西班牙</option><option>意大利</option><option>英国</option><option>墨西哥</option><option>德国</option><option>法国</option></select></label><label>产品<input value={accountForm.product} onChange={e => setAccountForm(prev => ({ ...prev, product: e.target.value }))} /></label></div>{accountError && <p className="error">{accountError}</p>}<button className="modal-primary" disabled={accountSaving || !accountForm.url.trim()} onClick={addMonitorAccount}>{accountSaving ? "正在保存…" : "确认添加"}</button></section></div>}
    {showConnection && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowConnection(false); }}><section className="monitor-modal connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title"><button className="modal-close" onClick={() => setShowConnection(false)}>×</button><span className="modal-kicker">DATA CONNECTION</span><h2 id="connection-title">自动采集接口尚未配置</h2><p>竞品账号的公开数据不能直接通过普通TikTok账号授权读取，需要使用合规的第三方TikTok数据服务。</p><div className="connection-steps"><article><b>1</b><div><strong>选择数据服务商</strong><span>需要支持按账号获取新视频、播放量、发布时间和视频链接。</span></div></article><article><b>2</b><div><strong>安全配置API密钥</strong><span>密钥应放在网站安全环境变量中，不要粘贴到普通页面或聊天记录。</span></div></article><article><b>3</b><div><strong>启用每日任务</strong><span>接口接通后再开启每日09:00同步、开头提取和去重。</span></div></article></div><div className="connection-status"><i /> 当前状态：未连接，不会伪造采集结果</div><button className="modal-primary" onClick={() => setShowConnection(false)}>我知道了</button></section></div>}
  </main>;
}
