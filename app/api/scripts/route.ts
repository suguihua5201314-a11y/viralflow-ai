import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { scripts } from "../../../db/schema";

type Payload = { product: string; sellingPoints: string; audience: string; country: string; language: string; style: string; duration: string; offer: string; nonce?: number };
type Pack = { hooks: string[]; intros: string[]; proofs: string[]; demos: string[]; benefits: string[]; ctas: string[] };

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
  const styleHooks: Record<string, Record<string, string[]>> = {
    中文: {
      强冲突测评: [`这三个${x}都在浪费钱，只有最后一个例外。`, `我准备用同样的方法，把四个${x}一起测到报废。`, `别再买普通${x}了，差距比你想的更离谱。`, `左边用了十分钟还失败，右边一次就成功。`],
      真实KOC种草: [`我后悔没有早点发现这个${x}。`, `这可能是我最近买过最省心的手机配件。`, `用完一周后，我终于知道它为什么一直缺货。`, `没有广告感，我只想说说这个${x}真实好用在哪。`],
      悬念揭秘: [`先别眨眼，最后这一步真的有点离谱。`, `我一开始完全没看懂这个设计，直到它自动完成了这一步。`, `猜猜为什么它上面多了这个小机关？`, `看到最后，你就知道普通${x}输在哪里。`],
      导演朋友的新玩具: [`这是我导演朋友刚带回来的新玩具。`, `我导演朋友说，这个东西第一眼绝对看不懂。`, `剧组今天收到一个奇怪的装置，最后居然用在了手机上。`, `导演喊停之前，我们拿这个东西做了一个实验。`],
      痛点解决: [`如果你每次都把${x}装歪，这条一定要看完。`, `手残党最怕的三个问题，它一次解决了。`, `气泡、灰尘、贴歪——终于不用再忍了。`, `为什么你的${x}总是失败？问题可能根本不在手。`],
    },
    西班牙语: {
      强冲突测评: [`Estos tres ${x} tiran tu dinero; solo el último cambia la historia.`, `Voy a probar cuatro ${x} de la misma forma hasta llevarlos al límite.`, `Deja de comprar ${x} normales: la diferencia es mucho mayor de lo que parece.`, `A la izquierda, diez minutos y un desastre; a la derecha, perfecto al primer intento.`],
      真实KOC种草: [`Me arrepiento de no haber descubierto antes este ${x}.`, `Puede ser el accesorio para móvil más práctico que he comprado últimamente.`, `Después de una semana usándolo, entendí por qué se agota tan rápido.`, `Sin parecer un anuncio: esto es lo que realmente me gustó de este ${x}.`],
      悬念揭秘: [`No parpadees: el último paso parece imposible.`, `Al principio no entendía este diseño, hasta que hizo esto solo.`, `¿Adivinas por qué tiene este pequeño mecanismo?`, `Espera al final y verás dónde fallan los ${x} normales.`],
      导演朋友的新玩具: [`Este es el nuevo juguete de mi amigo director.`, `Mi amigo director dijo que nadie entendería esto a primera vista.`, `Hoy llegó un aparato extraño al rodaje y acabó en mi móvil.`, `Antes de que el director gritara “corten”, hicimos esta prueba.`],
      痛点解决: [`Si siempre colocas mal el ${x}, mira esto hasta el final.`, `Resuelve de una vez los tres problemas que más odiamos.`, `Burbujas, polvo y desalineación: por fin se acabó.`, `Si tu ${x} siempre queda mal, quizá el problema no sean tus manos.`],
    },
    意大利语: {
      强冲突测评: [`Queste tre ${x} fanno buttare soldi; solo l'ultima cambia tutto.`, `Testerò quattro ${x} nello stesso modo fino al limite.`, `Smetti di comprare ${x} normali: la differenza è assurda.`, `A sinistra dieci minuti e un disastro, a destra perfetta al primo colpo.`],
      真实KOC种草: [`Mi pento di non aver scoperto prima questa ${x}.`, `Forse è l'accessorio per telefono più pratico che ho comprato di recente.`, `Dopo una settimana ho capito perché va sempre esaurita.`, `Senza sembrare una pubblicità: ecco cosa mi è piaciuto davvero.`],
      悬念揭秘: [`Non battere le palpebre: l'ultimo passaggio è assurdo.`, `All'inizio non capivo questo design, finché non ha fatto tutto da solo.`, `Indovina perché c'è questo piccolo meccanismo.`, `Aspetta la fine e vedrai dove sbagliano le protezioni normali.`],
      导演朋友的新玩具: [`Questo è il nuovo giocattolo del mio amico regista.`, `Il mio amico regista ha detto che nessuno lo avrebbe capito al primo sguardo.`, `Sul set è arrivato uno strano dispositivo ed è finito sul mio telefono.`, `Prima che il regista dicesse stop, abbiamo fatto questa prova.`],
      痛点解决: [`Se monti sempre male la ${x}, guarda fino alla fine.`, `Risolve in una volta i tre problemi più fastidiosi.`, `Bolle, polvere e disallineamento: finalmente basta.`, `Se la tua ${x} viene sempre male, forse non è colpa delle tue mani.`],
    },
    德语: {
      强冲突测评: [`Diese drei ${x} verschwenden dein Geld – nur der letzte ist anders.`, `Ich teste vier ${x} exakt gleich bis an ihre Grenze.`, `Kauf keine normalen ${x} mehr: Der Unterschied ist unglaublich.`, `Links zehn Minuten und ein Desaster, rechts beim ersten Versuch perfekt.`],
      真实KOC种草: [`Ich wünschte, ich hätte diesen ${x} früher entdeckt.`, `Vielleicht das praktischste Handy-Zubehör, das ich zuletzt gekauft habe.`, `Nach einer Woche wusste ich, warum er ständig ausverkauft ist.`, `Ohne Werbegefühl: Das hat mir daran wirklich gefallen.`],
      悬念揭秘: [`Nicht blinzeln – der letzte Schritt ist verrückt.`, `Erst verstand ich das Design nicht, dann erledigte es diesen Schritt von selbst.`, `Rate mal, warum hier dieser kleine Mechanismus sitzt.`, `Warte bis zum Ende, dann siehst du, wo normale ${x} scheitern.`],
      导演朋友的新玩具: [`Das ist das neue Spielzeug meines Regisseur-Freundes.`, `Mein Regisseur-Freund sagte, niemand versteht das auf den ersten Blick.`, `Heute kam ein seltsames Gerät ans Set – und landete auf meinem Handy.`, `Bevor der Regisseur Stopp rief, machten wir diesen Test.`],
      痛点解决: [`Wenn dein ${x} immer schief sitzt, schau bis zum Ende.`, `Es löst die drei nervigsten Probleme auf einmal.`, `Blasen, Staub und schiefe Ausrichtung – endlich vorbei.`, `Wenn dein ${x} immer misslingt, liegt es vielleicht nicht an deinen Händen.`],
    },
    英语: {
      强冲突测评: [`These three ${x} waste your money—only the last one changes everything.`, `I'm testing four ${x} the exact same way until they fail.`, `Stop buying ordinary ${x}; the difference is bigger than you think.`, `Ten minutes and a mess on the left, perfect first try on the right.`],
      真实KOC种草: [`I regret not finding this ${x} sooner.`, `This might be the most practical phone accessory I've bought lately.`, `After one week, I finally understood why it keeps selling out.`, `No ad energy—here's what I genuinely liked about this ${x}.`],
      悬念揭秘: [`Don't blink—the final step looks impossible.`, `I didn't understand this design until it completed this step by itself.`, `Can you guess why it has this tiny mechanism?`, `Wait until the end and you'll see where ordinary ${x} fail.`],
      导演朋友的新玩具: [`This is my director friend's new toy.`, `My director friend said nobody would understand this at first glance.`, `A strange device arrived on set today and ended up on my phone.`, `Before the director called cut, we ran this test.`],
      痛点解决: [`If you always install your ${x} crooked, watch this to the end.`, `It solves the three most annoying problems at once.`, `Bubbles, dust, misalignment—finally gone.`, `If your ${x} always fails, your hands may not be the problem.`],
    },
  };
  const common: Record<string, Omit<Pack,"hooks">> = {
    中文: { intros: [`我本来以为这只是换了一个包装，实际用过才发现结构完全不同。`, `先看普通款的结果：反复调整，还是留下灰尘和气泡。`, `我没有看说明书，想看看第一次用能不能成功。`, `很多人忽略了一个问题：失败往往发生在贴上去之前。`], proofs: [`它真正特别的地方是：${points}。`, `把过程放大看，关键差别都在这里：${points}。`, `不是靠运气，它用这几个设计减少出错：${points}。`, `我连续测试了三次，最稳定的表现是：${points}。`], demos: [`对准以后只做一个动作，工具会同时完成除尘和贴合。`, `不用用手反复找位置，从放上去到完成几乎没有停顿。`, `我故意不慢慢操作，结果依然一次贴正。`, `最舒服的是整个过程没有来回揭膜，也不用重新补救。`], benefits: [`对${audience}来说，最大的价值不是炫技，而是第一次就能成功。`, `如果你属于${audience}，这种设计会省掉很多时间。`, `最后表面干净、边缘整齐，日常使用也不会影响手机壳。`, `从安装到使用，它把最容易翻车的步骤都简化了。`], ctas: [`${offer}，想换的话可以趁现在看看。`, `别等屏幕出问题才想起保护，${offer}。`, `目前${offer}，需要的可以先去看看适配型号。`, `如果你也受够了反复失败，现在刚好是入手的时候：${offer}。`] },
    西班牙语: { intros: [`Pensaba que solo habían cambiado el envase, pero la estructura es completamente diferente.`, `Mira primero el resultado del modelo normal: reajustes, polvo y burbujas.`, `No leí las instrucciones; quería saber si funcionaba bien al primer intento.`, `Muchos olvidan algo: el fallo suele empezar antes de colocar el protector.`], proofs: [`La verdadera diferencia está aquí: ${points}.`, `Al ampliar el proceso se ve todo: ${points}.`, `No depende de la suerte; estos detalles reducen los errores: ${points}.`, `Lo probé tres veces y esto fue lo más consistente: ${points}.`], demos: [`Lo colocas, haces un solo movimiento y la herramienta elimina el polvo mientras se adhiere.`, `No tienes que buscar la posición con los dedos; el proceso no se detiene.`, `Lo hice rápido a propósito y aun así quedó alineado al primer intento.`, `Lo mejor es no tener que levantarlo, recolocarlo ni reparar burbujas.`], benefits: [`Para ${audience}, lo importante no es el truco: es acertar a la primera.`, `Si eres de ${audience}, este diseño ahorra mucho tiempo.`, `El acabado queda limpio, los bordes rectos y sigue funcionando con la funda.`, `Simplifica justo los pasos donde normalmente todo sale mal.`], ctas: [`${offer}; si estabas pensando en cambiarlo, míralo ahora.`, `No esperes a romper la pantalla para protegerla. ${offer}.`, `Ahora hay ${offer}; comprueba tu modelo antes de que se agote.`, `Si estás cansado de repetir la instalación, este es un buen momento: ${offer}.`] },
    意大利语: { intros: [`Pensavo avessero cambiato solo la confezione, ma la struttura è completamente diversa.`, `Prima guarda il risultato normale: continui aggiustamenti, polvere e bolle.`, `Non ho letto le istruzioni: volevo vedere se funzionava al primo tentativo.`, `Molti ignorano una cosa: l'errore spesso avviene prima dell'applicazione.`], proofs: [`La vera differenza è qui: ${points}.`, `Ingrandendo il processo si vede tutto: ${points}.`, `Non è fortuna; questi dettagli riducono gli errori: ${points}.`, `L'ho provata tre volte e questo è stato il risultato più costante: ${points}.`], demos: [`La posizioni, fai un solo movimento e lo strumento elimina la polvere mentre aderisce.`, `Non devi cercare la posizione con le dita: il processo non si interrompe.`, `L'ho fatto apposta velocemente ed è rimasta dritta al primo tentativo.`, `La parte migliore è non doverla sollevare, riallineare o eliminare le bolle.`], benefits: [`Per ${audience}, il valore vero è riuscirci al primo tentativo.`, `Se sei tra ${audience}, questo design fa risparmiare molto tempo.`, `La superficie resta pulita, i bordi precisi e la cover continua a calzare.`, `Semplifica proprio i passaggi in cui di solito tutto va storto.`], ctas: [`${offer}; se volevi cambiarla, guardala adesso.`, `Non aspettare che lo schermo si rompa. ${offer}.`, `Ora c'è ${offer}; controlla il tuo modello prima che finisca.`, `Se sei stanco di ripetere l'installazione, questo è il momento giusto: ${offer}.`] },
    德语: { intros: [`Ich dachte, nur die Verpackung sei neu – doch der Aufbau ist völlig anders.`, `Schau zuerst auf das normale Ergebnis: Nachjustieren, Staub und Blasen.`, `Ich las keine Anleitung, um zu sehen, ob es beim ersten Versuch klappt.`, `Viele übersehen: Der Fehler passiert oft schon vor dem Auflegen.`], proofs: [`Der echte Unterschied steckt hier: ${points}.`, `Vergrößert sieht man jedes Detail: ${points}.`, `Kein Glück – diese Details verhindern Fehler: ${points}.`, `Ich testete es dreimal; das war jedes Mal konstant: ${points}.`], demos: [`Auflegen, einmal ziehen – das Werkzeug entfernt Staub und bringt alles an.`, `Kein Nachjustieren mit den Fingern; der Ablauf bleibt ohne Unterbrechung.`, `Ich machte es absichtlich schnell und es saß trotzdem beim ersten Mal.`, `Am besten: kein Abheben, Neuausrichten oder nachträgliches Entfernen von Blasen.`], benefits: [`Für ${audience} zählt nicht der Trick, sondern dass es sofort gelingt.`, `Für ${audience} spart dieses Design richtig Zeit.`, `Die Oberfläche bleibt sauber, die Kanten gerade und die Hülle passt weiter.`, `Genau die Schritte, die sonst schiefgehen, werden vereinfacht.`], ctas: [`${offer}; wenn du wechseln willst, schau es dir jetzt an.`, `Warte nicht auf ein kaputtes Display. ${offer}.`, `Aktuell gilt ${offer}; prüfe dein Modell, bevor es weg ist.`, `Wenn du genug von Fehlversuchen hast, ist jetzt ein guter Moment: ${offer}.`] },
    英语: { intros: [`I thought they only changed the packaging, but the structure is completely different.`, `First, look at the ordinary result: constant adjusting, dust and bubbles.`, `I skipped the instructions to see whether a first-time user could get it right.`, `Most people miss one thing: failure usually starts before the protector touches the screen.`], proofs: [`The real difference is here: ${points}.`, `Zoom in and every detail becomes clear: ${points}.`, `It isn't luck; these details reduce mistakes: ${points}.`, `I tested it three times, and this stayed consistent: ${points}.`], demos: [`Line it up, make one move, and the tool removes dust while it applies.`, `No hunting for the position with your fingers; the process never stops.`, `I rushed it on purpose and it still landed straight on the first try.`, `The best part is no lifting, realigning or fixing bubbles afterward.`], benefits: [`For ${audience}, the real value is getting it right the first time.`, `If you're ${audience}, this design saves a lot of time.`, `The finish stays clean, the edges stay straight, and the case still fits.`, `It simplifies exactly the steps where installations normally fail.`], ctas: [`${offer}; if you were planning to replace yours, check it now.`, `Don't wait for a cracked screen to protect it. ${offer}.`, `Right now there's ${offer}; check your model before it sells out.`, `If you're tired of failed installs, this is a good time: ${offer}.`] },
  };
  return { hooks: styleHooks[p.language]?.[p.style] ?? styleHooks.中文[p.style] ?? styleHooks.中文.强冲突测评, ...common[p.language] ?? common.中文 };
}

function seededIndex(seed: number, offset: number, length: number) {
  const value = Math.abs(Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453);
  return Math.floor((value % 1) * length);
}

function fill(template: string, vars: Record<string,string>) {
  return Object.entries(vars).reduce((out,[key,value]) => out.replaceAll(`\${${key}}`, value), template);
}

function createScript(p: Payload, avoidHook?: string) {
  const t = words(p); const l = localized(p); const seed = p.nonce ?? Date.now();
  const vars = { x: l.product, points: l.sellingPoints, audience: l.audience, offer: l.offer };
  const choose = (items: string[], offset: number) => fill(items[seededIndex(seed, offset, items.length)], vars);
  const hookStart = seededIndex(seed, 1, t.hooks.length);
  let hooks = [0,1,2].map(i => fill(t.hooks[(hookStart + i) % t.hooks.length], vars));
  if (avoidHook && hooks[0] === avoidHook) hooks = [hooks[1], hooks[2], fill(t.hooks[(hookStart + 3) % t.hooks.length], vars)];
  const intro = choose(t.intros, 2), proof = choose(t.proofs, 3), demo = choose(t.demos, 4), benefit = choose(t.benefits, 5), cta = choose(t.ctas, 6);
  const narration = [hooks[0], intro, proof, demo, benefit, cta].join(" ");
  const visualVariants = [
    ["开场直接展示失败结果或破坏性测试", "普通款与产品同时入镜做强对比", "近景展示结构，手指指出关键机关", "一镜到底完成核心操作", "移动侧光展示最终效果", "重复一次最强卖点验证", "产品成品特写，指向购物入口"],
    ["手持产品快速冲进画面，制造突然感", "先展示用户常见翻车场景", "拆开包装并逐层展示核心部件", "俯拍真实操作，保留手部动作", "切换三个角度检查细节", "加入手机壳或日常使用验证", "手持成品口播收尾"],
    ["极近景只露出神秘装置，不给全貌", "慢慢拉远揭示产品用途", "分屏放大普通款和新品的不同", "快速跳切展示关键步骤", "用反光和边缘特写展示成品", "回放开头悬念并给出答案", "定格产品与优惠字幕"],
  ][seededIndex(seed, 7, 3)];
  const editVariants = [
    ["首帧大字＋撞击音效", "2个快速跳切", "关键词逐个弹出", "保留真实操作声", "前后对比分屏", "慢动作＋局部放大", "库存提示停留2秒"],
    ["0.3秒推近＋疑问字幕", "失败音效＋红色叉号", "结构线条标注", "速度提升1.2倍", "干净擦屏转场", "重复回放两次", "价格字幕＋箭头引导"],
    ["悬念音乐立即起", "节奏卡点切换", "微距画面＋旁白压低", "完整动作不切镜", "侧光扫过产品表面", "定格一秒强调结果", "音乐收紧后突然停顿"],
  ][seededIndex(seed, 8, 3)];
  const lines = [hooks[0], intro, proof, demo, benefit, l.sellingPoints.split(/[；;]/)[0], cta];
  const scenes = [
    { time: "0–3s", visual: visualVariants[0], line: lines[0], edit: editVariants[0] },
    { time: "3–7s", visual: visualVariants[1], line: lines[1], edit: editVariants[1] },
    { time: "7–14s", visual: visualVariants[2], line: lines[2], edit: editVariants[2] },
    { time: "14–24s", visual: visualVariants[3], line: lines[3], edit: editVariants[3] },
    { time: "24–32s", visual: visualVariants[4], line: lines[4], edit: editVariants[4] },
    { time: "32–40s", visual: visualVariants[5], line: lines[5], edit: editVariants[5] },
    { time: `40–${p.duration}s`, visual: visualVariants[6], line: lines[6], edit: editVariants[6] },
  ];
  return { title: `${p.product}｜${p.style}脚本`, product: p.product, language: p.language, country: p.country, style: p.style, hook: hooks[0], alternateHooks: hooks.slice(1), narration, scenes };
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
    const db = await getDb();
    const [previous] = await db.select({ hook: scripts.hook }).from(scripts).where(and(eq(scripts.product, p.product), eq(scripts.language, p.language), eq(scripts.style, p.style))).orderBy(desc(scripts.id)).limit(1);
    const generated = createScript(p, previous?.hook);
    const [saved] = await db.insert(scripts).values({ ...generated, alternateHooks: JSON.stringify(generated.alternateHooks), scenes: JSON.stringify(generated.scenes) }).returning();
    return Response.json({ script: rowToScript(saved) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "生成失败" }, { status: 500 }); }
}
