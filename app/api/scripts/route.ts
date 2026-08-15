import { frameworkCatalog } from "../../frameworks";

type RecentScript = { title:string; hook:string; narration:string };
type Payload = { product: string; sellingPoints: string; audience: string; country: string; language: string; style: string; framework?: string; duration: string; offer: string; referenceScript?: string; nonce?: number; recent?: RecentScript[] };
type Pack = { hooks: string[]; intros: string[]; proofs: string[]; demos: string[]; benefits: string[]; ctas: string[] };

function localized(p: Payload) {
  const maps: Record<string, Record<string, string>> = {
    西班牙语: { "变形金刚钢化膜":"protector de pantalla Transformers", "钢化膜": "protector de pantalla", "10秒自动除尘安装": "instalación con eliminación automática de polvo en 10 segundos", "无气泡、不歪": "sin burbujas ni desalineación", "28°防窥": "privacidad de 28°", "98%手机壳兼容": "compatible con el 98 % de las fundas", "表层电镀疏水疏油层":"capa electrochapada hidrofóbica y oleofóbica", "抗刮耐磨、抗冲击":"resistente a rayaduras, desgaste e impactos", "贴合紧密、不易翘边":"adhesión firme sin levantarse en los bordes", "库存有限":"stock limitado", "买一份到手两张膜":"dos protectores por el precio de uno", "现在下单加赠镜头保护膜":"compra ahora y recibe un protector de cámara de regalo", "经常自己贴坏钢化膜、在意隐私的手机用户": "quienes suelen instalar mal el protector y valoran su privacidad", "限时折扣，库存有限": "descuento por tiempo limitado y unidades limitadas" },
    意大利语: { "变形金刚钢化膜":"protezione schermo Transformers", "钢化膜": "protezione per lo schermo", "10秒自动除尘安装": "installazione antipolvere automatica in 10 secondi", "无气泡、不歪": "senza bolle né disallineamenti", "28°防窥": "privacy a 28°", "98%手机壳兼容": "compatibile con il 98% delle cover", "表层电镀疏水疏油层":"rivestimento elettroplaccato idrofobico e oleofobico", "抗刮耐磨、抗冲击":"resistente a graffi, usura e urti", "贴合紧密、不易翘边":"aderenza salda senza bordi sollevati", "经常自己贴坏钢化膜、在意隐私的手机用户": "chi applica spesso male la protezione e tiene alla privacy", "限时折扣，库存有限": "sconto a tempo limitato e scorte limitate" },
    德语: { "变形金刚钢化膜":"Transformers Displayschutz", "钢化膜": "Displayschutz", "10秒自动除尘安装": "automatische staubfreie Montage in 10 Sekunden", "无气泡、不歪": "ohne Blasen oder schiefe Ausrichtung", "28°防窥": "28° Sichtschutz", "98%手机壳兼容": "mit 98 % der Hüllen kompatibel", "表层电镀疏水疏油层":"galvanisierte wasser- und ölabweisende Beschichtung", "抗刮耐磨、抗冲击":"kratz-, verschleiß- und stoßfest", "贴合紧密、不易翘边":"fester Halt ohne abhebende Kanten", "经常自己贴坏钢化膜、在意隐私的手机用户": "alle, die Schutzfolien oft schief anbringen und Privatsphäre schätzen", "限时折扣，库存有限": "zeitlich begrenzter Rabatt, nur solange der Vorrat reicht" },
    英语: { "变形金刚钢化膜":"Transformers screen protector", "钢化膜": "screen protector", "10秒自动除尘安装": "automatic dust-removal installation in 10 seconds", "无气泡、不歪": "no bubbles or misalignment", "28°防窥": "28° privacy protection", "98%手机壳兼容": "compatible with 98% of cases", "表层电镀疏水疏油层":"electroplated hydrophobic and oleophobic coating", "抗刮耐磨、抗冲击":"scratch-, wear- and impact-resistant", "贴合紧密、不易翘边":"firm adhesion without lifting edges", "经常自己贴坏钢化膜、在意隐私的手机用户": "people who often install protectors crooked and care about privacy", "限时折扣，库存有限": "limited-time discount while stock lasts" },
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

const frameworkNames = frameworkCatalog.map(item => item.name);

function createAlternativeScript(p: Payload, framework: string, seed: number, avoidHooks: string[] = []) {
  const l = localized(p); const x = l.product, points = l.sellingPoints, offer = l.offer;
  type Copy = { hooks: Record<string,string[]>; fail:string; question:string; reveal:string; install:string; result:string; features:string; test:string; proof:string; cta:string };
  const copies: Record<string,Copy> = {
    中文: {
      hooks: {
        失败救援反转:["我已经贴废了三张膜，最后一次居然被这个工具救回来了。","别急着扔掉贴坏的膜，真正的问题可能不是你的手。"],
        导演朋友神秘道具:["这是我导演朋友今天带来的新玩具，猜猜它到底是干什么的？","剧组桌上突然多了一个奇怪装置，最后居然装到了手机上。"],
        价格挑战对比:["3欧元和30欧元的保护膜，真正的差距藏在安装以后。","便宜膜和高价膜都别急着买，我用同一台手机把它们测清楚。"],
        评论区质疑实测:["评论区都说这个自动除尘是假的，所以我故意把灰尘撒满屏幕。","有人说它只是广告效果，那我今天不剪镜头直接装一次。"],
        十秒安装挑战:["十秒之内贴好一张膜，失败我就把手机送给摄影师。","计时开始：不擦第二遍、不重新对位，看看十秒能不能完成。"],
        隐私视角实验:["我把同一句聊天内容放在三块屏幕上，旁边的人只看不到最后一块。","地铁上最尴尬的不是没座位，是旁边的人能看清你的整个屏幕。"],
        第一视角开箱:["第一视角体验最近一直缺货的手机配件，看它到底值不值。","包装看起来很普通，但打开以后这个结构让我停了一下。"],
      },
      fail:"先看普通方法：灰尘、气泡和贴歪，只要出现一个就得重新来。", question:"先别告诉答案，看到最后再判断它是不是智商税。", reveal:`真正不同的是这套${x}和一体式安装器。`, install:"手机放进去，按下底部再向前滑，定位、除尘和贴合一次完成。", result:"揭开工具看结果：没有灰尘、没有气泡、边缘整齐，十秒内完成。", features:`继续实测核心卖点：${points}。`, test:"我故意加大难度，用强光、侧视角、液体和刮擦逐项检查。", proof:"不靠剪辑，所有步骤和结果都在同一个镜头里完成。", cta:`需要的话点击购买入口，${offer}，先确认适配型号。`
    },
    西班牙语: {
      hooks: {
        失败救援反转:["Ya arruiné tres protectores y este pequeño aparato acaba de salvar el último intento.","Antes de culpar a tus manos por instalarlo mal, mira dónde empieza realmente el problema.","Polvo, burbujas y otra lámina a la basura… hasta que probé este sistema.","Esta instalación empezó como otro desastre, pero el final no tiene sentido.","Iba a tirar este último protector, y entonces encontré el paso que estaba haciendo mal."],
        导演朋友神秘道具:["Este es el nuevo juguete de mi amigo director. ¿Adivinas para qué sirve?","Hoy apareció un aparato extraño en el set y terminó instalado en mi teléfono.","Mi director dejó esto sobre la mesa y me prohibió abrirlo hasta encender la cámara.","Nadie del equipo acertó para qué servía esta caja negra.","Parece una herramienta de cine, pero espera a ver dónde termina."],
        价格挑战对比:["Un protector de 3 euros contra uno de 30: la diferencia real aparece después de instalarlo.","Barato o caro, hoy los dos se enfrentan a la misma prueba en el mismo teléfono.","Compré cuatro protectores baratos; al final gasté más que con esta caja.","¿Dos láminas por este precio o seguir pagando por instalaciones fallidas?","El protector más barato de la mesa acaba de salir carísimo."],
        评论区质疑实测:["Los comentarios dicen que la eliminación automática de polvo es falsa, así que voy a llenar la pantalla de polvo.","Dicen que solo funciona por la edición; hoy lo instalo en un solo plano y sin cortes.","Este comentario asegura que el aplicador es puro marketing; vamos a comprobarlo.","Me pidieron probarlo sin limpiar la pantalla una segunda vez. Aquí está.","Según vosotros, las burbujas están ocultas por la luz; hoy cambio el ángulo."],
        十秒安装挑战:["Diez segundos para instalarlo perfecto; si fallo, le regalo el móvil al cámara.","Empieza el cronómetro: sin recolocar, sin una segunda limpieza y sin esconder errores.","Tengo diez segundos y una sola oportunidad para dejar esta pantalla perfecta.","Cuando llegue a cero, no puedo tocar otra vez el protector.","Cronómetro, teléfono nuevo y cero margen de error: empezamos."],
        隐私视角实验:["Puse el mismo mensaje en tres pantallas y la persona de al lado solo no pudo leer la última.","Lo peor del metro no es ir de pie, es que la persona de al lado pueda leer toda tu pantalla.","Desde aquí puedes leerlo todo; da dos pasos al lado y desaparece.","Le pedí a mi compañero que leyera este mensaje sin mirar de frente.","Esta pantalla muestra dos cosas distintas según dónde estés sentado."],
        第一视角开箱:["Primera persona probando el accesorio para móvil que siempre aparece agotado.","La caja parece normal, pero al abrirla este mecanismo me hizo detenerme.","Acabo de recibir el protector que se instala sin tocar el cristal.","Abrí el paquete esperando una lámina normal, pero venía con esto.","POV: cambias de móvil y esta es la primera caja que abres."],
        生活事故救场:["El móvil cayó justo sobre las llaves; ahora toca comprobar si la pantalla sobrevivió.","Un vaso volcado, una mesa llena y el teléfono en el peor lugar posible.","Mi pantalla rozó el cierre metálico del bolso durante todo el día.","Este golpe ocurre todos los días, pero casi nadie prueba el protector así.","Dejé el móvil donde nunca debería estar: debajo de todo lo que llevo en el bolso."],
        视觉谜题反转:["¿Por qué esta gota no se queda sobre la pantalla?","Hay algo raro en esta pantalla: mírala desde el lado.","Parece que estoy deslizando una caja vacía, pero mira el cristal.","Tres pantallas, una misma imagen y solo una desaparece al girarla.","No es un truco de edición: la suciedad acaba de salir sola por este lado."],
      },
      fail:"Con el método normal aparecen polvo, burbujas o desalineación, y basta un error para empezar otra vez.", question:"No decidas todavía si es útil o una pérdida de dinero; mira la prueba completa.", reveal:`La diferencia está en este ${x} y su aplicador integrado.`, install:"Colocas el móvil, presionas abajo y deslizas; alineación, eliminación de polvo y adhesión ocurren en un solo movimiento.", result:"Retiramos la herramienta: sin polvo, sin burbujas, bordes rectos y listo en menos de diez segundos.", features:`Ahora comprobamos los puntos clave: ${points}.`, test:"Aumento la dificultad con luz fuerte, vista lateral, líquido y una prueba de rayaduras.", proof:"Sin trucos de edición: el proceso y el resultado permanecen en el mismo plano.", cta:`Si lo necesitas, haz clic en el enlace. ${offer}; comprueba primero tu modelo.`
    },
    意大利语: {
      hooks: {
        失败救援反转:["Ho già rovinato tre pellicole e questo strumento ha salvato l'ultimo tentativo.","Prima di dare la colpa alle tue mani, guarda dove inizia davvero l'errore."],
        导演朋友神秘道具:["Questo è il nuovo giocattolo del mio amico regista. Indovina a cosa serve.","Oggi sul set è apparso uno strano dispositivo ed è finito sul mio telefono."],
        价格挑战对比:["Protezione da 3 euro contro una da 30: la vera differenza arriva dopo l'installazione.","Economica o costosa, oggi affrontano lo stesso test sullo stesso telefono."],
        评论区质疑实测:["I commenti dicono che la rimozione automatica della polvere è falsa, quindi riempio lo schermo di polvere.","Dicono che funziona solo grazie al montaggio: oggi faccio tutto senza tagli."],
        十秒安装挑战:["Dieci secondi per installarla perfettamente; se sbaglio regalo il telefono al cameraman.","Parte il cronometro: niente riallineamento e nessun errore nascosto."],
        隐私视角实验:["Ho messo lo stesso messaggio su tre schermi e quello accanto non riusciva a leggere solo l'ultimo.","In metro il problema è quando chi ti sta accanto legge tutto lo schermo."],
        第一视角开箱:["In prima persona provo l'accessorio per telefono che è sempre esaurito.","La scatola sembra normale, ma questo meccanismo mi ha fatto fermare."],
      },
      fail:"Con il metodo normale bastano polvere, bolle o un disallineamento per ricominciare.", question:"Non decidere ancora se serve davvero: guarda il test completo.", reveal:`La differenza è questa ${x} con applicatore integrato.`, install:"Inserisci il telefono, premi in basso e fai scorrere: allineamento, polvere e adesione in un gesto.", result:"Rimuovi lo strumento: niente polvere o bolle, bordi dritti e meno di dieci secondi.", features:`Ora verifichiamo i punti chiave: ${points}.`, test:"Aumento la difficoltà con luce forte, vista laterale, liquido e graffi.", proof:"Nessun trucco di montaggio: processo e risultato restano nello stesso piano.", cta:`Se ti serve, clicca sul link. ${offer}; controlla prima il modello.`
    },
    德语: {
      hooks: {
        失败救援反转:["Drei Schutzfolien sind schon kaputt, doch dieses Werkzeug rettet den letzten Versuch.","Bevor du deinen Händen die Schuld gibst, sieh dir an, wo der Fehler wirklich beginnt."],
        导演朋友神秘道具:["Das ist das neue Spielzeug meines Regisseur-Freundes. Rate, wofür es ist.","Heute lag ein seltsames Gerät am Set und landete schließlich auf meinem Handy."],
        价格挑战对比:["3 Euro gegen 30 Euro: Der echte Unterschied zeigt sich erst nach der Montage.","Billig oder teuer, beide machen heute denselben Test auf demselben Handy."],
        评论区质疑实测:["Die Kommentare sagen, die automatische Staubentfernung sei falsch – also streue ich Staub aufs Display.","Angeblich klappt es nur durch Schnitte; heute montiere ich alles in einer Aufnahme."],
        十秒安装挑战:["Zehn Sekunden für eine perfekte Montage; wenn ich scheitere, bekommt der Kameramann das Handy.","Die Uhr läuft: kein Neuausrichten und keine versteckten Fehler."],
        隐私视角实验:["Dieselbe Nachricht auf drei Displays – nur das letzte konnte die Person daneben nicht lesen.","In der Bahn ist das Schlimmste, wenn die Person neben dir dein Display mitliest."],
        第一视角开箱:["Aus der Ich-Perspektive teste ich das ständig ausverkaufte Handy-Zubehör.","Die Box wirkt normal, doch dieser Mechanismus ließ mich kurz stoppen."],
      },
      fail:"Bei der normalen Methode reichen Staub, Blasen oder Schieflage für einen neuen Versuch.", question:"Urteile noch nicht, ob es nützlich ist – sieh dir den ganzen Test an.", reveal:`Der Unterschied ist dieser ${x} mit integriertem Applikator.`, install:"Handy einlegen, unten drücken und schieben: Ausrichtung, Staubentfernung und Haftung in einem Zug.", result:"Werkzeug abnehmen: kein Staub, keine Blasen, gerade Kanten und unter zehn Sekunden.", features:`Jetzt prüfen wir die Hauptvorteile: ${points}.`, test:"Der Test wird härter: starkes Licht, Seitenansicht, Flüssigkeit und Kratzer.", proof:"Keine Schnitt-Tricks: Ablauf und Ergebnis bleiben in derselben Aufnahme.", cta:`Wenn du ihn brauchst, klicke auf den Link. ${offer}; prüfe zuerst dein Modell.`
    },
    英语: {
      hooks: {
        失败救援反转:["I've already ruined three protectors, and this tiny tool just saved the last attempt.","Before blaming your hands, look at where the installation actually goes wrong."],
        导演朋友神秘道具:["This is my director friend's new toy. Can you guess what it does?","A strange device appeared on set today and ended up on my phone."],
        价格挑战对比:["A 3-dollar protector versus a 30-dollar one: the real difference appears after installation.","Cheap or expensive, both face the same test on the same phone."],
        评论区质疑实测:["The comments say automatic dust removal is fake, so I'm covering the screen in dust.","They say it only works because of editing, so today this is one take with no cuts."],
        十秒安装挑战:["Ten seconds for a perfect install; if I fail, the cameraman gets my phone.","Start the timer: no realigning, no second cleaning and no hidden mistakes."],
        隐私视角实验:["I put the same message on three screens, and the person beside me could only not read the last one.","The worst part of the subway is the person next to you reading your entire screen."],
        第一视角开箱:["First-person test of the phone accessory that always seems sold out.","The box looks ordinary, but this mechanism made me stop for a second."],
      },
      fail:"With the normal method, dust, bubbles or misalignment can force you to start again.", question:"Don't decide whether it is useful yet; watch the complete test.", reveal:`The difference is this ${x} with its integrated applicator.`, install:"Place the phone, press the bottom and slide; alignment, dust removal and adhesion happen in one move.", result:"Lift the tool: no dust, no bubbles, straight edges and finished in under ten seconds.", features:`Now we verify the key claims: ${points}.`, test:"I make it harder with strong light, a side angle, liquid and a scratch test.", proof:"No editing tricks: the process and result stay in the same shot.", cta:`If you need it, click the link. ${offer}; check your model first.`
    }
  };
  const c = copies[p.language] ?? copies.中文;
  const hookOptions = c.hooks[framework] ?? c.hooks.失败救援反转;
  const freshHookOptions = hookOptions.filter(item => !avoidHooks.includes(item));
  const selectableHooks = freshHookOptions.length ? freshHookOptions : hookOptions;
  const hook = selectableHooks[seededIndex(seed, 31, selectableHooks.length)];
  const orders: Record<string,Array<keyof Omit<Copy,"hooks"> | "hook">> = {
    失败救援反转:["hook","fail","reveal","install","result","features","cta"],
    导演朋友神秘道具:["hook","question","reveal","install","result","test","cta"],
    价格挑战对比:["hook","fail","test","reveal","install","proof","cta"],
    评论区质疑实测:["hook","question","test","install","result","proof","cta"],
    十秒安装挑战:["hook","install","result","features","test","proof","cta"],
    隐私视角实验:["hook","test","reveal","install","features","proof","cta"],
    第一视角开箱:["hook","reveal","install","result","features","proof","cta"],
  };
  const order = orders[framework] ?? orders.失败救援反转;
  const lines = order.map(key => key === "hook" ? hook : c[key]);
  const visualSets: Record<string,string[]> = {
    失败救援反转:["桌面摆出三张失败成品，第四张拿在手里","极近景展示灰尘、气泡和歪边","神秘安装器快速入镜","俯拍一镜到底完成安装","撕开工具展示反转结果","连续验证产品卖点","产品、优惠和购物入口收尾"],
    导演朋友神秘道具:["只展示神秘装置局部，不说用途","旋转装置让观众猜用途","拉远镜头揭晓产品","导演视角俯拍完整操作","特写展示成品","回放开头并完成压力测试","包装与优惠字幕定格"],
    价格挑战对比:["左右摆放低价和高价产品及价格牌","同步展示两种安装失败点","同一标准进行多项测试","新品从中间进入画面","完整展示安装步骤","分屏公布测试结果","选择建议与购买入口"],
    评论区质疑实测:["首帧放大评论截图式字幕","镜头前读出质疑并立下挑战","故意撒灰或增加测试难度","全程不切镜完成安装","近景检查四角和屏幕","原镜头回放证明无剪辑","回应评论并给购买入口"],
    十秒安装挑战:["手机与倒计时器同时入镜","计时开始后快速完成三步","10秒停表并揭开工具","立即检查气泡和对齐","快切验证防窥与疏水","回放计时全过程","挑战结果与限时优惠"],
    隐私视角实验:["公共场景模拟旁人偷看屏幕","左右移动机位测试可视角度","揭晓防窥产品","返回桌面完成安装","多角度测试防窥和触控","普通膜与新品分屏对比","适用场景和购买入口"],
    第一视角开箱:["第一视角拆开快递包装","逐层拿出产品和安装器","手机放入工具","第一视角完成按压和滑动","拿起手机检查成品","切换日常使用场景验证","包装、赠品和CTA收尾"],
  };
  const visuals = visualSets[framework] ?? visualSets.失败救援反转;
  const duration = Number(p.duration) || 45; const step = Math.max(4, Math.floor(duration / lines.length));
  const scenes = lines.map((line,index) => ({ time: index === lines.length - 1 ? `${index * step}–${duration}s` : `${index * step}–${(index + 1) * step}s`, visual: visuals[index], line, edit: index === 0 ? "首帧大字＋即时冲突音效" : index === lines.length - 1 ? "优惠字幕停留2秒" : "按动作节点快切，保留真实操作声" }));
  return { title:`${p.product}｜${framework}`, product:p.product, language:p.language, country:p.country, style:p.style, hook, alternateHooks:[...hookOptions.filter(x => x !== hook), c.question].slice(0,2), narration:lines.join(" "), scenes };
}

type AiOpening = { hook:string; bridge:string; hookVisual?:string; bridgeVisual?:string };

function createScript(p: Payload, avoidHooks: string[] = [], avoidTitles: string[] = [], aiOpenings: AiOpening[] = []) {
  void words(p);
  const l = localized(p); const seed = p.nonce ?? Date.now();
  const freshFrameworks = frameworkNames.filter(name => !avoidTitles.some(title => title.endsWith(`｜${name}`)));
  const availableFrameworks = freshFrameworks.length ? freshFrameworks : frameworkNames;
  const framework = p.framework && p.framework !== "智能随机" ? p.framework : availableFrameworks[seededIndex(seed, 30, availableFrameworks.length)];
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
      [`完成以后撕掉安装器，再用附送的布压实四周。你看到的结果是：没有灰尘、没有气泡、没有贴歪，十秒内完成。`, `取下工具看结果，边缘整齐、屏幕干净，一次安装成功。`],
      [`它的核心表现包括：${l.sellingPoints}。表面疏水疏油，液体会滑走，也不容易留下指纹。`, `除了${l.sellingPoints}，它还能减少刮痕和日常撞击，贴合后不容易翘边。`],
      [`现在回到刚才的${tool}，同样的力度，直接落下去。屏幕依然完好。`, `刚才留下的悬念现在揭晓：同一件工具、同一种测试，它扛住了。`],
      [`这才是你的手机应该得到的保护，也是${l.product}提供的品质。`, `不是看起来高级，而是在安装和测试中都经得住验证。`],
      [`喜欢的话点击购买链接。${l.offer}，现在下单还可以查看双片装和镜头膜赠品。`, `${l.offer}。需要的话现在点击购物入口，先确认你的手机型号。`],
    ],
    西班牙语: [
      [`${tool} versus vidrio templado convencional, protector de privacidad y una lámina de aluminio.`, `${tool}, cuatro protectores y exactamente la misma prueba.`, `Hoy esta ${tool} decide cuál de estos protectores merece estar en tu móvil.`, `Tres protectores prometen lo mismo; esta ${tool} va a descubrir cuál miente.`, `No compres otro protector hasta ver lo que esta ${tool} hace con los cuatro.`, `Misma pantalla, mismo golpe y cuatro resultados completamente distintos.`, `Uno de estos protectores cuesta dinero; los otros tres también pueden costarte la pantalla.`, `Voy a golpear el último con la misma ${tool}, pero antes mira cómo se instala.`],
      [`Esos tres protectores solo están gastando tu dinero, dinero directamente tirado a la basura.`, `Los tres primeros parecen protección, pero cuando llega la prueba solo hacen que pierdas dinero.`],
      [`Pero hoy vamos a probar un ${l.product} completamente diferente.`, `El último es un ${l.product} con una estructura totalmente distinta.`],
      [`En un momento lo pruebo con la misma herramienta. La dejo aquí, pero antes mira cómo se instala.`, `No cambio la herramienta y no cambio la prueba; primero vamos a instalarlo y después volvemos al golpe.`],
      [`Es más sencillo que nunca: solo tres pasos. Colocas el móvil, haces clic aquí abajo y deslizas. La herramienta se autoalinea y elimina el polvo al mismo tiempo.`, `Posicionas el teléfono, presionas la parte inferior y deslizas. No necesitas tocar el cristal ni buscar la posición con los dedos.`],
      [`Retiramos el aplicador y repasamos las esquinas con el paño incluido. El resultado es impecable: sin polvo, sin burbujas, sin desalineación e instalado en menos de diez segundos.`, `Quitamos la herramienta y mira los bordes: limpio, recto y bien adherido al primer intento.`],
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
  const alternative = framework !== "破坏测试对比" ? createAlternativeScript(p, framework, seed, avoidHooks) : null;
  const thirdOpenings: Record<string,string> = {
    中文: `如果连${tool}都扛不住，这些保护膜就不值得你花钱。`,
    西班牙语: `Si no resisten ${tool}, estos protectores no merecen ni un euro de tu dinero.`,
    意大利语: `Se non resistono a ${tool}, queste protezioni non valgono i tuoi soldi.`,
    德语: `Wenn sie ${tool} nicht aushalten, sind diese Schutzfolien dein Geld nicht wert.`,
    英语: `If they cannot survive ${tool}, these protectors are not worth your money.`,
  };
  const freshAiOpenings = aiOpenings.filter(item => item.hook && item.bridge && !avoidHooks.includes(item.hook));
  const selectedAiOpening = freshAiOpenings[seededIndex(seed, 88, Math.max(1, freshAiOpenings.length))];
  const allOpenings = freshAiOpenings.length ? freshAiOpenings.map(item => item.hook) : alternative ? [alternative.hook, ...alternative.alternateHooks] : [...sections[0], thirdOpenings[p.language] ?? thirdOpenings.中文];
  const freshOpenings = allOpenings.filter(item => !avoidHooks.includes(item));
  const openingPool = freshOpenings.length ? freshOpenings : allOpenings;
  const hookStart = seededIndex(seed, 1, openingPool.length);
  const hooks = [0,1,2].map(i => openingPool[(hookStart + i) % openingPool.length]);
  const fixedBodies:Record<string,string[]> = {
    中文:[
      "你只需要取出TRANSFORMERS钢化膜，用配套清洁布擦干净屏幕，清除污渍和指纹，擦成这样就没问题。",
      "就算落上一点灰尘也不用担心，直接盖上膜。贴上除尘贴，轻轻一滑，再撕掉表层薄膜，膜就自动贴合上去了。",
      "你可以轻轻掀起边角，用手指抚平边缘，再撕掉最外层保护膜。搞定！没有灰尘、没有气泡、不会贴歪，边缘顺滑。",
      "这款是防窥版本，左右28°防窥，保护你的隐私。",
      "表层还有电镀疏水疏油涂层，水珠不会挂屏，指纹很难残留。",
      "还能防刮，就算用这种刀片划也没事。如果你经常把手机丢包里，这个性能对你来说至关重要。",
      "接下来我们马上做暴力测试。这就是好坏保护膜实实在在的差距。",
      "优惠库存有限，抓紧入手！"
    ],
    西班牙语:[
      "Solo tienes que sacar el protector de pantalla TRANSFORMERS, limpiar bien la pantalla con el paño incluido y eliminar la suciedad y las huellas. Así está perfecto.",
      "Aunque caiga un poco de polvo, no pasa nada. Colocas el protector, pegas la tira antipolvo, deslizas suavemente y retiras la película superior. Se adhiere automáticamente.",
      "Puedes levantar un poco una esquina, repasar los bordes con el dedo y retirar la última capa protectora. Listo: sin polvo, sin burbujas, sin desalineación y con bordes suaves.",
      "Esta es la versión de privacidad: 28 grados a cada lado para proteger lo que ves en tu pantalla.",
      "También tiene una capa electrochapada hidrofóbica y oleofóbica. El agua no se queda y las huellas apenas dejan marca.",
      "Además resiste los arañazos; incluso una cuchilla como esta no le hace nada. Si llevas el móvil dentro del bolso, esta función es muy importante.",
      "Ahora vamos directamente a la prueba de impacto. Esta es la diferencia real entre un protector bueno y uno malo.",
      "La oferta y el stock son limitados. Consíguelo ahora."
    ],
    意大利语:[
      "Basta prendere la protezione TRANSFORMERS, pulire bene lo schermo con il panno incluso ed eliminare sporco e impronte. Così va benissimo.",
      "Anche se cade un po' di polvere, non importa. Appoggia la protezione, applica la striscia antipolvere, fai scorrere e rimuovi la pellicola superiore. Aderisce automaticamente.",
      "Solleva leggermente un angolo, passa il dito sui bordi e rimuovi l'ultimo strato. Fatto: niente polvere, bolle o disallineamento, con bordi lisci.",
      "Questa è la versione privacy: 28 gradi su entrambi i lati per proteggere ciò che guardi.",
      "Ha anche un rivestimento elettroplaccato idrofobico e oleofobico: l'acqua scivola via e le impronte non restano.",
      "È resistente ai graffi: persino una lama come questa non lascia segni. Se tieni spesso il telefono in borsa, è fondamentale.",
      "Ora passiamo subito al test d'impatto. Questa è la vera differenza tra una buona protezione e una scadente.",
      "Offerta e scorte sono limitate. Prendila ora."
    ],
    德语:[
      "Nimm einfach den TRANSFORMERS Displayschutz heraus, reinige das Display mit dem beiliegenden Tuch und entferne Schmutz und Fingerabdrücke. So ist es perfekt.",
      "Selbst etwas Staub ist kein Problem. Schutz auflegen, Staubstreifen anbringen, sanft schieben und die obere Folie abziehen. Er haftet automatisch.",
      "Eine Ecke leicht anheben, mit dem Finger über die Ränder fahren und die letzte Schutzschicht abziehen. Fertig: kein Staub, keine Blasen, nicht schief und glatte Kanten.",
      "Das ist die Sichtschutzversion: 28 Grad auf beiden Seiten schützen deine Privatsphäre.",
      "Dazu kommt eine galvanisierte wasser- und ölabweisende Beschichtung. Wasser bleibt nicht liegen und Fingerabdrücke haften kaum.",
      "Er ist außerdem kratzfest; selbst eine Klinge wie diese hinterlässt nichts. Wenn dein Handy oft in der Tasche liegt, ist das entscheidend.",
      "Jetzt folgt sofort der Härtetest. Das ist der echte Unterschied zwischen gutem und schlechtem Displayschutz.",
      "Angebot und Bestand sind begrenzt. Hol ihn dir jetzt."
    ],
    英语:[
      "Just take out the TRANSFORMERS screen protector, clean the screen with the included cloth, and remove the dirt and fingerprints. Once it looks like this, you're good.",
      "Even if a little dust lands on it, don't worry. Place the protector, apply the dust-removal strip, slide it gently, and peel off the top film. It attaches automatically.",
      "Lift one corner slightly, run your finger around the edges, and remove the outer protective layer. Done: no dust, no bubbles, no misalignment, and smooth edges.",
      "This is the privacy version, with 28-degree privacy protection on both sides to protect your screen.",
      "It also has an electroplated hydrophobic and oleophobic coating. Water does not stay, and fingerprints barely leave a mark.",
      "It is scratch resistant too; even a blade like this does nothing. If you keep your phone in your bag, this feature is essential.",
      "Now we're going straight to the impact test. This is the real difference between a good and a bad screen protector.",
      "The offer and stock are limited. Get yours now."
    ]
  };
  const localBridge = alternative?.scenes[1]?.line ?? choose(sections[1], 21);
  const lines = [hooks[0], selectedAiOpening?.bridge ?? localBridge, ...(fixedBodies[p.language] ?? fixedBodies.中文)];
  const narration = lines.join(" ");
  const times = ["0–3s","3–6s","6–9s","9–13s","13–22s","22–29s","29–36s","36–41s","41–44s",`44–${p.duration}s`];
  const visuals = [selectedAiOpening?.hookVisual ?? alternative?.scenes[0]?.visual ?? "真实测试道具与普通保护膜同框，首帧直接开始动作",selectedAiOpening?.bridgeVisual ?? alternative?.scenes[1]?.visual ?? "普通保护膜测试失败，TRANSFORMERS产品入镜并预告稍后复测","用配套清洁布彻底擦净屏幕污渍和指纹","直接盖上保护膜，贴除尘贴后滑动并撕掉表层薄膜","轻掀边角、手指抚平四周，再撕掉最外层保护膜并展示无尘无泡结果","左右移动机位展示28°防窥效果","滴水并按压指纹，展示疏水疏油效果","用刀片划过表面，再展示手机与钥匙同放包内的场景","回到开头的道具，完成同条件暴力复测并展示差距","产品包装、库存优惠和购买入口同框收尾"];
  const edits = ["撞击音效＋首帧大字","快速跳切＋红叉","产品登场音效","悬念音乐压低","保留真实操作声","无滤镜近景＋结果字幕","每个卖点1秒快切","慢动作回放＋局部放大","定格1秒突出结果","库存与优惠字幕停留2秒"];
  const scenes = lines.map((line, index) => ({ time: times[index], visual: visuals[index], line, edit: edits[index] }));
  return { title: `${p.product}｜${framework}`, product: p.product, language: p.language, country: p.country, style: p.style, hook: hooks[0], alternateHooks: hooks.slice(1), narration, scenes };
}

async function createAiScript(p: Payload, recent: Array<{ title:string; hook:string; narration:string }>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const seed = Number(p.nonce ?? Date.now());
  const selectedFramework = p.framework && p.framework !== "智能随机" ? p.framework : frameworkNames[seededIndex(seed, 73, frameworkNames.length)];
  const selectedCatalogFramework = frameworkCatalog.find(item => item.name === selectedFramework);
  const blueprint: Record<string,string> = {
    破坏测试对比:"危险工具或强冲击首帧→三种普通款逐一失败并判定浪费钱→新品登场，承诺稍后用同一工具测试→先完整安装→逐项展示输入卖点→回到同一工具完成复测→结果特写→优惠CTA",
    失败救援反转:"贴膜失败结果首帧→气泡/灰尘/贴歪连续暴露→指出旧方法问题→新品登场→完整安装救援→逐项可视化验证卖点→新旧结果并排→优惠CTA",
    导演朋友神秘道具:"奇怪装置首帧并称为导演朋友的新玩具→观众猜用途→快速揭晓是产品→展示三步操作→逐项验证卖点→最终成片级结果→优惠CTA",
    价格挑战对比:"两种价格或浪费的钱首帧→便宜款连续失败的隐性成本→新品登场→同样条件安装与测试→结果和价值对照→购买建议→优惠CTA",
    评论区质疑实测:"质疑评论占满首帧→直接宣布现场验证→产品登场→按评论要求完成安装和测试→逐条给证据→正面回应质疑→优惠CTA",
    十秒安装挑战:"倒计时与未拆封产品首帧→宣布十秒挑战→连续无剪切完成安装→停表展示结果→补充可视化卖点测试→挑战结论→优惠CTA",
    隐私视角实验:"旁人能看见屏幕的尴尬首帧→普通屏左右视角测试→产品登场和安装→同机位复测视角→补充其它输入卖点→隐私结果→优惠CTA",
    第一视角开箱:"第一视角拆包发现关键机关→马上猜测它的用途→取出产品直接安装→展示一次成功结果→日常场景验证卖点→真实评价→优惠CTA",
    生活事故救场:"手机在真实生活场景遭遇意外首帧→旧保护方式暴露问题→新品登场→安装与针对性验证→回到同类意外复测→结果特写→优惠CTA",
    视觉谜题反转:"一个看不懂但强烈的画面首帧→给一个错误猜测→三秒内揭晓产品用途→安装操作→卖点证据→谜题答案回扣→优惠CTA"
  };
  const recentText = recent.length ? recent.slice(0,5).map((item,index) => `${index + 1}. ${item.title}｜${item.hook}`).join("\n") : "暂无历史钩子";
  const replicationRules = p.referenceScript?.trim() ? `\n这是“爆款复刻”任务。先在内部拆解参考文案的钩子机制、信息顺序、短句节奏、测试动作、悬念位置和成交方式，再用用户当前产品重新创作。保留的是抽象结构与节奏，不得连续照抄参考文案中的原句，不得保留不属于当前产品的品牌、参数、优惠或测试结论。新脚本必须让人看出是同一种爆款框架，但文案和镜头是新的。` : "";
  const instructions = `你是Magic John风格的TikTok钢化膜实拍编导。你要写的是一条从头到尾属于同一个创意的完整脚本，不是“随机开头＋固定产品介绍”。不得混合两套框架，不得让开头测试与结尾测试脱节。${replicationRules}

每条脚本输出9到11个镜头，并严格走完这一条主线：
1. 真实动作钩子：首帧就出现道具、数字、失败结果或强对比，不说空泛广告句。
2. 冲突升级：普通膜、仿品或旧方法在同一测试中暴露具体问题。
3. 新品登场：TRANSFORMERS出现，并承诺稍后用开头的同一道具、同一高度或同一条件复测。
4. 自然转场：用一句真人口语把测试暂停，顺势进入安装，不能像广告旁白硬切。
5. 安装演示：清洁屏幕→放入/盖上产品→除尘与滑动贴合→取下安装器→抚平边缘。步骤不能漏，但句子必须根据本条剧情重新写，禁止套固定文案。
6. 成品结果：没有灰尘、没有气泡、不会贴歪、边缘顺滑；用画面检查证明。
7. 卖点连击：28°防窥、电镀疏水疏油、防指纹、抗刮耐磨、抗冲击、贴合紧密不易翘边。每个卖点必须配一个能拍出来的动作，不得只报参数。
8. 首尾闭环：回到开头完全相同的测试条件，兑现悬念并给出明确结果。
9. 促单收尾：只使用用户输入的优惠，短而直接。

写作硬规则：
1. 输出语言必须是用户指定语言。西班牙语要像西班牙或拉美TikTok真人说话，短句、自然、有停顿，禁止翻译腔和AI腔。
2. 模仿Magic John的“动作推动口播”：一个动作一句话，一句话一个镜头；允许重复关键词制造节奏。
3. 开头不能只是换斧头、锤子名称。测试机制、数字、失败过程、悬念方式和结尾回扣都要服从本次指定框架。
4. 安装和卖点可以换说法、换顺序、换拍法，但上面列出的必要事实一个都不能少。
5. 不得出现“兼容98%手机壳”。不得虚构9H等级、认证、防水等级、价格或折扣。
6. 禁止这些通用AI开头：你不会相信、看到最后、今天我要给大家介绍、这可能是最好的、你还在用吗。
7. hook必须等于第一个镜头的line；narration必须严格由全部scene.line按顺序组成。
8. 两个备选钩子必须能无缝接入同一个第二镜头，不能改变后面的测试道具或剧情。
9. 画面必须能由桌拍或模特实拍完成，visual写具体道具、手部动作、机位和结果；edit只写必要的节奏与音效。
10. 不解释创作过程，只输出严格有效JSON。`;
  const input = `请创作一条全新TikTok带货脚本。
产品：${p.product}
核心卖点：${p.sellingPoints}
目标用户：${p.audience}
市场：${p.country}
输出语言：${p.language}
指定框架：${selectedFramework}
唯一允许的框架逻辑：${selectedCatalogFramework?.blueprint ?? blueprint[selectedFramework] ?? blueprint.破坏测试对比}
表达风格：${p.style}
视频时长：${p.duration}秒
促销信息：${p.offer}

最近使用过的钩子（只需避开原句，不要受它们的结构影响）：
${recentText}

${p.referenceScript?.trim() ? `需要复刻其结构的爆款参考文案：\n${p.referenceScript.trim()}` : "本次没有参考文案，请按指定框架原创。"}`;
  const schema = {
    type:"object", additionalProperties:false,
    properties:{
      title:{type:"string"},
      framework:{type:"string"},
      hook:{type:"string"},
      alternateHooks:{type:"array",items:{type:"string"}},
      narration:{type:"string"},
      scenes:{type:"array",items:{type:"object",additionalProperties:false,properties:{time:{type:"string"},visual:{type:"string"},line:{type:"string"},edit:{type:"string"}},required:["time","visual","line","edit"]}}
    },
    required:["title","framework","hook","alternateHooks","narration","scenes"]
  };
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},
    body:JSON.stringify({
      model:"deepseek-v4-pro",
      messages:[{role:"system",content:`${instructions}\n必须返回严格有效的JSON，结构必须符合：${JSON.stringify(schema)}`},{role:"user",content:input}],
      thinking:{type:"disabled"},
      response_format:{type:"json_object"},
      temperature:0.82,
      max_tokens:5000
    })
  });
  const data = await response.json() as { error?:{message?:string}; choices?:Array<{message?:{content?:string}}> };
  if (!response.ok) throw new Error(data.error?.message || "DeepSeek生成失败");
  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) throw new Error("DeepSeek没有返回有效脚本");
  const generated = JSON.parse(outputText) as { title:string; framework:string; hook:string; alternateHooks:string[]; narration:string; scenes:Array<{time:string;visual:string;line:string;edit:string}> };
  if (!Array.isArray(generated.scenes) || generated.scenes.length < 8 || !generated.hook || !Array.isArray(generated.alternateHooks)) throw new Error("生成结果结构不完整");
  const narration = generated.scenes.map(scene => scene.line.trim()).filter(Boolean).join("\n");
  return { title:`${p.product}｜${selectedFramework}`, product:p.product, language:p.language, country:p.country, style:p.style, hook:generated.scenes[0]?.line || generated.hook, alternateHooks:generated.alternateHooks.slice(0,2), narration, scenes:generated.scenes, aiGenerated:true };
}
export async function GET() {
  return Response.json({ scripts: [], aiConnected:Boolean(process.env.DEEPSEEK_API_KEY), provider:"DeepSeek V4 Pro" });
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Payload & { teamSync?: boolean; password?: string; action?: "load" | "save"; payload?: unknown };
    const isTeamSync = body.teamSync === true || new URL(request.url).searchParams.get("teamSync") === "1";
    if (isTeamSync) {
      const expectedPassword = process.env.TEAM_PASSWORD;
      if (!expectedPassword || body.password !== expectedPassword) return Response.json({ error: "团队密码不正确" }, { status: 401 });
      // @ts-expect-error Cloudflare injects this module in the hosted runtime.
      const { env } = await import("cloudflare:workers");
      if (!env.DB) return Response.json({ error: "云端数据库未连接" }, { status: 503 });
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS team_workspace (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
      if (body.action === "save") {
        await env.DB.prepare("INSERT INTO team_workspace (workspace_key,payload,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP")
          .bind(JSON.stringify(body.payload ?? {})).run();
        return Response.json({ ok: true });
      }
      const row = await env.DB.prepare("SELECT payload,updated_at FROM team_workspace WHERE workspace_key='main'").first() as { payload: string; updated_at: string } | null;
      return Response.json({ payload: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at ?? null });
    }
    const p = body as Payload;
    if (!p.product?.trim() || !p.sellingPoints?.trim()) return Response.json({ error: "请填写产品名称和核心卖点。" }, { status: 400 });
    if (p.referenceScript !== undefined && p.referenceScript.trim().length < 30) return Response.json({ error: "请粘贴完整的爆款参考文案，至少30个字。" }, { status: 400 });
    const recent = (p.recent ?? []).slice(0, 8);
    const aiScript = await createAiScript(p, recent).catch(() => null);
    const generated = aiScript ?? createScript(p, recent.map(item => item.hook), recent.map(item => item.title), []);
    return Response.json({ script: { ...generated, aiGenerated:Boolean(aiScript), id:Date.now(), createdAt:new Date().toISOString() } }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "生成失败" }, { status: 500 }); }
}
