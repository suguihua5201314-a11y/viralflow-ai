import { desc, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { scripts } from "../../../db/schema";

type Payload = { product: string; sellingPoints: string; audience: string; country: string; language: string; style: string; duration: string; offer: string };
type Pack = { hooks: string[]; intro: string; proof: string; install: string; benefit: string; cta: string };

function localized(p: Payload) {
  const maps: Record<string, Record<string, string>> = {
    西班牙语: { "钢化膜": "protector de pantalla", "10秒自动除尘安装": "instalación con eliminación automática de polvo en 10 segundos", "无气泡、不歪": "sin burbujas ni desalineación", "28°防窥": "privacidad de 28°", "98%手机壳兼容": "compatible con el 98 % de las fundas", "经常自己贴坏钢化膜、在意隐私的手机用户": "quienes suelen instalar mal el protector y valoran su privacidad", "限时折扣，库存有限": "descuento por tiempo limitado y unidades limitadas" },
    意大利语: { "钢化膜": "protezione per lo schermo", "10秒自动除尘安装": "installazione antipolvere automatica in 10 secondi", "无气泡、不歪": "senza bolle né disallineamenti", "28°防窥": "privacy a 28°", "98%手机壳兼容": "compatibile con il 98% delle cover", "经常自己贴坏钢化膜、在意隐私的手机用户": "chi applica spesso male la protezione e tiene alla privacy", "限时折扣，库存有限": "sconto a tempo limitato e scorte limitate" },
    德语: { "钢化膜": "Displayschutz", "10秒自动除尘安装": "automatische staubfreie Montage in 10 Sekunden", "无气泡、不歪": "ohne Blasen oder schiefe Ausrichtung", "28°防窥": "28° Sichtschutz", "98%手机壳兼容": "mit 98 % der Hüllen kompatibel", "经常自己贴坏钢化膜、在意隐私的手机用户": "alle, die Schutzfolien oft schief anbringen und Privatsphäre schätzen", "限时折扣，库存有限": "zeitlich begrenzter Rabatt, nur solange der Vorrat reicht" },
    英语: { "钢化膜": "screen protector", "10秒自动除尘安装": "automatic dust-removal installation in 10 seconds", "无气泡、不歪": "no bubbles or misalignment", "28°防窥": "28° privacy protection", "98%手机壳兼容": "compatible with 98% of cases", "经常自己贴坏钢化膜、在意隐私的手机用户": "people who often install protectors crooked and care about privacy", "限时折扣，库存有限": "limited-time discount while stock lasts" },
  };
  const translate = (value: string) => Object.entries(maps[p.language] ?? {}).sort((a, b) => b[0].length - a[0].length).reduce((out, [a, b]) => out.split(a).join(b), value).replaceAll("；", "; ").replaceAll("、", ", ");
  return { product: translate(p.product), sellingPoints: translate(p.sellingPoints), audience: translate(p.audience), offer: translate(p.offer) };
}

function words(p: Payload): Pack {
  const l = localized(p); const x = l.product, points = l.sellingPoints, audience = l.audience, offer = l.offer;
  const packs: Record<string, Pack> = {
    中文: { hooks: [`等等，这个${x}为什么和普通的不一样？`, `我导演朋友的新玩具，居然用在了手机上。`, `如果你每次都把${x}装歪，先别划走。`], intro: `我原本以为所有${x}都差不多，直到我实际试了这个。`, proof: `真正让我意外的是：${points}。`, install: `整个过程不用反复对位置，跟着工具一步完成，新手也能一次贴好。`, benefit: `特别适合${audience}，日常使用省心很多。`, cta: `${offer}，需要的话趁现在看看。` },
    西班牙语: { hooks: [`Espera, ¿por qué este ${x} no se instala como los demás?`, `Este es el nuevo juguete de mi amigo director… y terminó en mi móvil.`, `Si siempre colocas mal el ${x}, no pases este vídeo.`], intro: `Pensaba que todos los protectores eran iguales hasta que probé este de verdad.`, proof: `Lo que más me sorprendió fue esto: ${points}.`, install: `No tienes que alinearlo una y otra vez: sigues la herramienta y queda colocado a la primera.`, benefit: `Es ideal para ${audience} y hace el uso diario mucho más sencillo.`, cta: `${offer}. Si lo necesitas, échale un vistazo ahora.` },
    意大利语: { hooks: [`Aspetta, perché questo ${x} non si applica come gli altri?`, `Questo è il nuovo giocattolo del mio amico regista… ed è finito sul mio telefono.`, `Se monti sempre male il ${x}, non scorrere.`], intro: `Pensavo che tutte le protezioni fossero uguali, finché non ho provato davvero questa.`, proof: `La cosa che mi ha sorpreso di più è questa: ${points}.`, install: `Non devi riallinearla continuamente: segui lo strumento e si applica al primo tentativo.`, benefit: `È ideale per ${audience} e rende l'uso quotidiano molto più semplice.`, cta: `${offer}. Se ti serve, dagli un'occhiata adesso.` },
    德语: { hooks: [`Warte – warum wird dieses ${x} völlig anders angebracht?`, `Das ist das neue Spielzeug meines Regisseur-Freundes… jetzt ist es auf meinem Handy.`, `Wenn dein ${x} immer schief sitzt, scroll nicht weiter.`], intro: `Ich dachte, alle Schutzfolien wären gleich – bis ich diese wirklich getestet habe.`, proof: `Das hat mich am meisten überrascht: ${points}.`, install: `Du musst nicht ständig neu ausrichten: dem Werkzeug folgen und es sitzt beim ersten Versuch.`, benefit: `Ideal für ${audience} und im Alltag deutlich entspannter.`, cta: `${offer}. Wenn du es brauchst, schau es dir jetzt an.` },
    英语: { hooks: [`Wait—why doesn't this ${x} install like the others?`, `This is my director friend's new toy… and it ended up on my phone.`, `If you always install your ${x} crooked, don't scroll.`], intro: `I thought every screen protector was basically the same until I actually tested this one.`, proof: `This is what surprised me most: ${points}.`, install: `There is no endless realigning—follow the tool and it lands correctly on the first try.`, benefit: `It is made for ${audience} and makes everyday use much easier.`, cta: `${offer}. If you need one, take a look now.` },
  };
  return packs[p.language] ?? packs.中文;
}

function createScript(p: Payload) {
  const t = words(p); const l = localized(p); const narration = [t.hooks[0], t.intro, t.proof, t.install, t.benefit, t.cta].join(" ");
  const scenes = [
    { time: "0–3s", visual: "极近景展示反常动作或产品装置，先不给全貌", line: t.hooks[0], edit: "首帧大字＋撞击音效" },
    { time: "3–7s", visual: "普通产品失败画面与新品快速对比", line: t.intro, edit: "2个快速跳切" },
    { time: "7–14s", visual: "俯拍拆开产品，手指指出核心结构", line: t.proof, edit: "卖点关键词逐个弹出" },
    { time: "14–24s", visual: "完整展示安装/使用关键步骤", line: t.install, edit: "保留真实操作声" },
    { time: "24–32s", visual: "侧光或近景展示最终效果", line: t.benefit, edit: "前后对比分屏" },
    { time: "32–40s", visual: "补拍最强卖点的验证镜头", line: l.sellingPoints.split(/[；;]/)[0], edit: "慢动作＋局部放大" },
    { time: `40–${p.duration}s`, visual: "产品成品特写，手指指向购物入口", line: t.cta, edit: "价格/库存提示，停留2秒" },
  ];
  return { title: `${p.product}｜${p.style}脚本`, product: p.product, language: p.language, country: p.country, style: p.style, hook: t.hooks[0], alternateHooks: t.hooks.slice(1), narration, scenes };
}
function rowToScript(row: typeof scripts.$inferSelect) { return { ...row, alternateHooks: JSON.parse(row.alternateHooks), scenes: JSON.parse(row.scenes) }; }
async function ensureSchema() {
  const db = await getDb();
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    product TEXT NOT NULL,
    language TEXT NOT NULL,
    country TEXT NOT NULL,
    style TEXT NOT NULL,
    hook TEXT NOT NULL,
    alternate_hooks TEXT NOT NULL,
    narration TEXT NOT NULL,
    scenes TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`));
}

export async function GET() {
  try { await ensureSchema(); const db = await getDb(); const rows = await db.select().from(scripts).orderBy(desc(scripts.id)).limit(100); return Response.json({ scripts: rows.map(rowToScript) }); }
  catch { return Response.json({ scripts: [] }); }
}
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const p = await request.json() as Payload;
    if (!p.product?.trim() || !p.sellingPoints?.trim()) return Response.json({ error: "请填写产品名称和核心卖点。" }, { status: 400 });
    const generated = createScript(p);
    const db = await getDb();
    const [saved] = await db.insert(scripts).values({ ...generated, alternateHooks: JSON.stringify(generated.alternateHooks), scenes: JSON.stringify(generated.scenes) }).returning();
    return Response.json({ script: rowToScript(saved) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "生成失败" }, { status: 500 }); }
}
