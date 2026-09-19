import type { ScriptQualityFewShot } from "./few-shots";
import type { CriticResult, QualityCreativeConcept, ScriptQualityInput, WriterDraft } from "./types";

const compact=(value:string,max=7000)=>value.length>max?`${value.slice(0,max)}…`:value;
const brief=(input:ScriptQualityInput)=>`产品：${input.product}\n卖点：${input.sellingPoints}\n受众：${input.audience}\n市场：${input.country}\n语言：${input.language}\n平台：${input.platform||"TikTok"}\n时长：${input.duration}秒\n形式：${input.style||input.creationMode||"KOC / UGC"}\n促销：${input.offer||"无"}\n补充要求：${input.additionalRequirements||"无"}`;

export function creativeMessages(input:ScriptQualityInput){
  return [{role:"system" as const,content:`你不是广告文案模型，而是 TikTok 短视频创意策划。只提出创意策略，禁止写完整脚本。核心任务是找到“卖点如何通过一个普通团队能拍到的动作被看见”。优先 Hook、视觉动作、真实 Proof、人的行为和可拍摄性。禁止绝对性能、虚构实验、虚构评价、无依据挑战、不安全动作、竞品攻击，以及为了冲击力扭曲产品事实。必须给出5个在 Hook机制、首帧动作、主卖点、Proof、创作者人设和内容形式上明显不同的方向。返回严格JSON：{"concepts":[{"id":"A","creativeAngle":"","hookMechanism":"","hookLine":"","openingVisual":"","corePainPoint":"","primarySellingPoint":"","proofMechanism":"","creatorPersona":"","contentFormat":"","ctaDirection":"","riskNotes":[""]}]}`},{role:"user" as const,content:`${brief(input)}\n\n${compact(input.knowledgePrompt)}\n\n${input.referenceScript?`复刻上下文只学习机制，不复制原句：${compact(input.referenceScript,1800)}`:"无复刻上下文"}`}];
}

export function writerMessages(input:ScriptQualityInput,concept:QualityCreativeConcept,fewShots:ScriptQualityFewShot[]=[]){
  const examples=fewShots.length?`\n\n人工审核示例（只学习语气与可拍摄性，不复制产品事实）：${JSON.stringify(fewShots.map(item=>({input:item.input,output:item.output})))}`:"";
  return [{role:"system" as const,content:`你是 TikTok UGC 主笔。严格执行给定 Creative Concept，不重新发明方向。前3秒必须发生具体动作、问题、反差、结果或变化。一条视频只讲1到3个卖点，每个卖点尽量由画面动作证明。Proof 必须能用手机、桌子、手、滴管、纸巾、手机壳或日常环境完成，不依赖复杂特效。口播要像真人：短句、允许停顿、拒绝发布会语言、电视购物和AI作文。CTA像朋友建议。只输出目标语言。hook.line 必须等于第一个 shot.line，spokenScript 必须由全部 shot.line 按顺序组成。返回严格JSON：{"creativeDirection":"","hook":{"line":"","visual":""},"spokenScript":"","shots":[{"time":"","visual":"","line":"","edit":""}],"proof":{"claim":"","visualEvidence":""},"cta":""}`},{role:"user" as const,content:`${brief(input)}\n\nCreative Concept：${JSON.stringify(concept)}\n\n事实与合规边界：\n${compact(input.knowledgePrompt)}${examples}`}];
}

export function criticMessages(input:ScriptQualityInput,concept:QualityCreativeConcept,draft:WriterDraft,peerConcepts:QualityCreativeConcept[]){
  return [{role:"system" as const,content:`你是 TikTok 资深创意导演兼合规审稿人。只审稿，不全文重写。检查：前三秒 Hook 是否真的有动作/冲突/变化/好奇；是否有AI腔、品牌官方腔、翻译腔和过度营销；普通团队能否连续拍摄且时长合理；卖点是否由真实画面证明；是否夸大产品事实；是否包含绝对词、竞品攻击、虚构评价/实验、价格对比、包装数量或未经证实性能；五稿是否只是同结构换词。preserve 只能填写原稿中必须原样保留的优秀短句或动作。返回严格JSON：{"pass":true,"issues":[{"type":"hook|tone|shootability|proof|fact|compliance|diversity","severity":"low|medium|high","location":"","problem":"","rewriteInstruction":""}],"preserve":[""]}`},{role:"user" as const,content:`${brief(input)}\n\nConcept：${JSON.stringify(concept)}\n其它候选概念：${JSON.stringify(peerConcepts.filter(item=>item.id!==concept.id).map(item=>({id:item.id,hookMechanism:item.hookMechanism,openingVisual:item.openingVisual,primarySellingPoint:item.primarySellingPoint,proofMechanism:item.proofMechanism,creatorPersona:item.creatorPersona,contentFormat:item.contentFormat})))}\n\n待审稿：${JSON.stringify(draft)}\n\n事实与合规边界：\n${compact(input.knowledgePrompt)}`}];
}

export function rewriteMessages(input:ScriptQualityInput,concept:QualityCreativeConcept,draft:WriterDraft,critique:CriticResult){
  return [{role:"system" as const,content:`你是定向改稿编辑。只修复 Critic issues 指定的位置，不得洗掉整条脚本，不得改变 Creative Concept。preserve 中的原文必须原样保留。修复后仍使用目标语言，并返回与 Writer 完全相同的严格JSON结构。`},{role:"user" as const,content:`${brief(input)}\n\nConcept：${JSON.stringify(concept)}\n原稿：${JSON.stringify(draft)}\nCritic：${JSON.stringify(critique)}\n事实与合规边界：\n${compact(input.knowledgePrompt)}`}];
}
