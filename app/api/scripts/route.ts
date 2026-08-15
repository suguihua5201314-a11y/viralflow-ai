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
  void words(p);
  const l = localized(p); const seed = p.nonce ?? Date.now();
  const vars = { x: l.product, points: l.sellingPoints, audience: l.audience, offer: l.offer };
  const choose = (items: string[], offset: number) => fill(items[seededIndex(seed, offset, items.length)], vars);
  const tools: Record<string, string[]> = {
    中文: ["一把真正的斧头", "一把铁锤", "一把金属扳手", "一把螺丝刀"],
    西班牙语: ["un hacha real", "un martillo de acero", "una llave metálica", "un destornillador"],
    意大利语: ["un'ascia vera", "un martello d'acciaio", "una chiave metallica", "un cacciavite"],
    德语: ["eine echte Axt", "einen Stahlhammer", "einen Metallschlüssel", "einen Schraubendreher"],
    英语: ["a real axe", "a steel hammer", "a metal wrench", "a screwdriver"],
  };
  const tool = (tools[p.language] ?? tools.中文)[seededIndex(seed, 9, 4)];
  const scriptsByLanguage: Record<string, string[][]> = {
    中文: [
      [`${tool}，对比普通钢化膜、防窥膜和铝制保护片。`, `同一把${tool}，今天测试四种不同的屏幕保护方案。`],
      [`前三种只是在浪费你的钱，钱直接扔进垃圾桶。`, `普通款看起来都差不多，真正测试时差距马上出现。`],
      [`但今天我们要测试一款完全不同的${l.product}。`, `最后登场的，是结构完全不同的${l.product}。`],
      [`等一下我会用同一个工具测试它，先放在这里，我们先看它怎么安装。`, `破坏测试先别急，工具不换，安装完成以后马上继续。`],
      [`安装比你想得更简单，只需要三步：定位、按下、滑动。自动对齐工具会在贴合时带走灰尘。`, `把手机放进去，对准位置，按下底部再向前滑，整个过程不用用手找位置。`],
      [`完成以后撕掉安装器，再用附送的布压实四周。你看到的结果是：没有灰尘、没有气泡、没有贴歪，十秒内完成。`, `取下工具看结果，边缘整齐、屏幕干净，一次安装成功，而且兼容大多数手机壳。`],
      [`它的核心表现包括：${l.sellingPoints}。表面疏水疏油，液体会滑走，也不容易留下指纹。`, `除了${l.sellingPoints}，它还能减少刮痕和日常撞击，贴合后不容易翘边。`],
      [`现在回到刚才的${tool}，同样的力度，直接落下去。屏幕依然完好。`, `刚才留下的悬念现在揭晓：同一件工具、同一种测试，它扛住了。`],
      [`这才是你的手机应该得到的保护，也是${l.product}提供的品质。`, `不是看起来高级，而是在安装和测试中都经得住验证。`],
      [`喜欢的话点击购买链接。${l.offer}，现在下单还可以查看双片装和镜头膜赠品。`, `${l.offer}。需要的话现在点击购物入口，先确认你的手机型号。`],
    ],
    西班牙语: [
      [`${tool} versus vidrio templado convencional, protector de privacidad y una lámina de aluminio.`, `${tool}, cuatro protectores y exactamente la misma prueba.`],
      [`Esos tres protectores solo están gastando tu dinero, dinero directamente tirado a la basura.`, `Los tres primeros parecen protección, pero cuando llega la prueba solo hacen que pierdas dinero.`],
      [`Pero hoy vamos a probar un ${l.product} completamente diferente.`, `El último es un ${l.product} con una estructura totalmente distinta.`],
      [`En un momento lo pruebo con la misma herramienta. La dejo aquí, pero antes mira cómo se instala.`, `No cambio la herramienta y no cambio la prueba; primero vamos a instalarlo y después volvemos al golpe.`],
      [`Es más sencillo que nunca: solo tres pasos. Colocas el móvil, haces clic aquí abajo y deslizas. La herramienta se autoalinea y elimina el polvo al mismo tiempo.`, `Posicionas el teléfono, presionas la parte inferior y deslizas. No necesitas tocar el cristal ni buscar la posición con los dedos.`],
      [`Retiramos el aplicador y repasamos las esquinas con el paño incluido. El resultado es impecable: sin polvo, sin burbujas, sin desalineación e instalado en menos de diez segundos.`, `Quitamos la herramienta y mira los bordes: limpio, recto y bien adherido al primer intento, además compatible con la mayoría de las fundas.`],
      [`Sus puntos clave son ${l.sellingPoints}. La capa hidrofóbica y oleofóbica hace que los líquidos resbalen y evita que las huellas se queden marcadas.`, `Además de ${l.sellingPoints}, resiste rayaduras y golpes cotidianos y se adhiere firmemente sin levantarse con facilidad.`],
      [`Ahora volvemos al ${tool}. Misma herramienta, misma fuerza y golpe directo. La pantalla sigue intacta.`, `¿Recuerdas la prueba del principio? Aquí está la respuesta: mismo impacto y el protector lo resiste.`],
      [`Esta es la protección que tu móvil merece y la calidad que ofrece ${l.product}.`, `No es solo una instalación bonita; es protección demostrada delante de la cámara.`],
      [`Si te gustó, haz clic en el enlace de compra. ${l.offer}. Revisa la oferta de dos protectores y el regalo para la cámara.`, `${l.offer}. Haz clic ahora, elige tu modelo y aprovecha la promoción antes de que cambie.`],
    ],
    意大利语: [
      [`${tool} contro vetro temperato normale, pellicola privacy e protezione in alluminio.`, `${tool}, quattro protezioni e la stessa identica prova.`],
      [`Le prime tre stanno solo facendo buttare via i tuoi soldi.`, `Sembrano tutte uguali, ma sotto un test reale la differenza si vede subito.`],
      [`Oggi però proviamo una ${l.product} completamente diversa.`, `L'ultima è una ${l.product} costruita in modo completamente diverso.`],
      [`Tra poco userò lo stesso strumento; prima però guarda come si installa.`, `Lascio qui lo strumento: dopo l'installazione torniamo subito al test.`],
      [`Bastano tre passaggi: posiziona, premi e fai scorrere. Lo strumento si allinea ed elimina la polvere.`, `Inserisci il telefono, premi in basso e fai scorrere senza toccare il vetro.`],
      [`Rimuovi l'applicatore e premi gli angoli con il panno incluso: niente polvere, bolle o disallineamento, in meno di dieci secondi.`, `Tolto lo strumento, il risultato è pulito, dritto e aderente al primo tentativo.`],
      [`I punti chiave sono ${l.sellingPoints}. Il rivestimento idrofobico e oleofobico fa scivolare liquidi e impronte.`, `Oltre a ${l.sellingPoints}, resiste a graffi e urti quotidiani senza sollevarsi facilmente.`],
      [`Torniamo al ${tool}: stesso impatto, colpo diretto e lo schermo resta intatto.`, `Ecco la risposta al test iniziale: stesso strumento e protezione superata.`],
      [`Questa è la protezione che il tuo telefono merita.`, `Non è solo bella da installare: la protezione è dimostrata.`],
      [`Clicca sul link di acquisto. ${l.offer}.`, `${l.offer}: scegli ora il tuo modello prima che finisca.`],
    ],
    德语: [
      [`${tool} gegen normales Panzerglas, Sichtschutzfolie und Aluminiumschutz.`, `${tool}, vier Schutzfolien und exakt derselbe Test.`],
      [`Die ersten drei verschwenden nur dein Geld.`, `Sie sehen ähnlich aus, aber im echten Test zeigt sich sofort der Unterschied.`],
      [`Heute testen wir jedoch einen völlig anderen ${l.product}.`, `Der letzte ${l.product} ist komplett anders aufgebaut.`],
      [`Gleich teste ich ihn mit demselben Werkzeug. Vorher siehst du die Montage.`, `Das Werkzeug bleibt liegen; nach der Montage geht der Test sofort weiter.`],
      [`Nur drei Schritte: positionieren, unten drücken und schieben. Das Werkzeug richtet aus und entfernt Staub.`, `Handy einlegen, unten drücken, schieben – ohne das Glas anzufassen.`],
      [`Applikator abnehmen und die Ecken andrücken: kein Staub, keine Blasen, nicht schief und in unter zehn Sekunden fertig.`, `Nach dem Abnehmen ist alles sauber, gerade und beim ersten Versuch fest angebracht.`],
      [`Die wichtigsten Vorteile: ${l.sellingPoints}. Die wasser- und ölabweisende Schicht lässt Flüssigkeit und Fingerabdrücke abgleiten.`, `Zusätzlich zu ${l.sellingPoints} schützt er vor Kratzern und alltäglichen Stößen.`],
      [`Zurück zum ${tool}: gleicher Aufprall, direkter Schlag und das Display bleibt intakt.`, `Jetzt lösen wir den Anfang auf: gleiches Werkzeug, Test bestanden.`],
      [`Das ist der Schutz, den dein Handy verdient.`, `Nicht nur eine saubere Montage, sondern sichtbar geprüfter Schutz.`],
      [`Klicke auf den Kauflink. ${l.offer}.`, `${l.offer}. Wähle jetzt dein Modell, bevor es ausverkauft ist.`],
    ],
    英语: [
      [`${tool} versus ordinary tempered glass, a privacy protector and an aluminum sheet.`, `${tool}, four protectors and the exact same test.`],
      [`The first three are only wasting your money.`, `They look similar, but a real test exposes the difference immediately.`],
      [`Today we're testing a completely different ${l.product}.`, `The last ${l.product} uses a completely different structure.`],
      [`I'll test it with the same tool in a moment. First, watch how it installs.`, `The tool stays right here; after installation we go straight back to the impact test.`],
      [`It takes three steps: position, press and slide. The tool aligns itself and removes dust as it applies.`, `Place the phone inside, press the bottom and slide without touching the glass.`],
      [`Remove the applicator and press the corners with the included cloth: no dust, bubbles or misalignment, installed in under ten seconds.`, `Lift the tool and the result is clean, straight and fully attached on the first try.`],
      [`The key benefits are ${l.sellingPoints}. Its hydrophobic and oleophobic coating lets liquid and fingerprints slide away.`, `Beyond ${l.sellingPoints}, it resists everyday scratches and impacts without lifting easily.`],
      [`Back to the ${tool}: same impact, direct hit, and the screen remains intact.`, `Here's the answer to the opening test: same tool, and the protector takes the hit.`],
      [`This is the protection your phone deserves.`, `It isn't just satisfying to install; the protection is proven on camera.`],
      [`Click the purchase link. ${l.offer}. Check the two-pack and camera protector offer.`, `${l.offer}. Choose your model now before the promotion changes.`],
    ],
  };
  const sections = scriptsByLanguage[p.language] ?? scriptsByLanguage.中文;
  const thirdOpenings: Record<string,string> = {
    中文: `如果连${tool}都扛不住，这些保护膜就不值得你花钱。`,
    西班牙语: `Si no resisten ${tool}, estos protectores no merecen ni un euro de tu dinero.`,
    意大利语: `Se non resistono a ${tool}, queste protezioni non valgono i tuoi soldi.`,
    德语: `Wenn sie ${tool} nicht aushalten, sind diese Schutzfolien dein Geld nicht wert.`,
    英语: `If they cannot survive ${tool}, these protectors are not worth your money.`,
  };
  const openingPool = [...sections[0], thirdOpenings[p.language] ?? thirdOpenings.中文];
  const hookStart = seededIndex(seed, 1, openingPool.length);
  let hooks = [0,1,2].map(i => openingPool[(hookStart + i) % openingPool.length]);
  if (avoidHook && hooks[0] === avoidHook) hooks = [hooks[1], hooks[2], hooks[0]];
  const lines = sections.map((variants, index) => choose(variants, 20 + index));
  lines[0] = hooks[0];
  const narration = lines.join(" ");
  const times = ["0–3s","3–6s","6–9s","9–13s","13–22s","22–29s","29–36s","36–41s","41–44s",`44–${p.duration}s`];
  const visuals = ["破坏工具砸向三种普通保护膜，首帧直接给冲突","三种竞品并排，逐个打叉或扔进垃圾桶","产品和包装从画外快速推入镜头","工具留在画面边缘，镜头转向安装器","俯拍完整展示定位、按下、滑动三步","撕下安装器，用布压实四角并展示干净屏幕","微距展示防窥、疏水、指纹和手机壳兼容测试","回到开头的工具，完成同力度破坏测试","屏幕亮起，展示完好结果和产品特写","双片装、赠品和购物入口同框收尾"];
  const edits = ["撞击音效＋首帧大字","快速跳切＋红叉","产品登场音效","悬念音乐压低","保留真实操作声","无滤镜近景＋结果字幕","每个卖点1秒快切","慢动作回放＋局部放大","定格1秒突出结果","库存与优惠字幕停留2秒"];
  const scenes = lines.map((line, index) => ({ time: times[index], visual: visuals[index], line, edit: edits[index] }));
  return { title: `${p.product}｜破坏测试完整结构`, product: p.product, language: p.language, country: p.country, style: p.style, hook: hooks[0], alternateHooks: hooks.slice(1), narration, scenes };
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
