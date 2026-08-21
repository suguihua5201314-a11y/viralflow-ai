export type RiskLevel = "高" | "中" | "低";
export type RiskType = "平台违规" | "广告夸大" | "医疗功效" | "促销合规" | "危险演示";
export type ComplianceHit = { category:string; riskType:RiskType; level:RiskLevel; term:string; suggestion:string; replacement:string };

const rules: Array<{ category:string; riskType:RiskType; level:RiskLevel; terms:string[]; suggestion:string; replacement:string }> = [
  { category:"绝对化承诺", riskType:"广告夸大", level:"高", terms:["百分之百","100%","绝对","永远","从不","零风险","完全不会","一定","必然","最佳","最好","第一","唯一","顶级","完美无瑕","garantizado","garantizada","100 %","nunca","siempre","el mejor","la mejor","número uno","único","única","perfecto","perfecta","guaranteed","never","always","the best","number one","perfect"], suggestion:"无条件保证通常无法证明，容易被判定为夸大或误导。", replacement:"改成“在本次测试条件下”“有助于”“日常使用中表现更稳定”。" },
  { category:"虚假身份或背书", riskType:"平台违规", level:"高", terms:["官方指定","平台认证","国家认证","专家保证","医生推荐","权威推荐","officially approved","platform certified","doctor recommended","aprobado oficialmente","recomendado por médicos"], suggestion:"没有真实、可展示的授权或认证材料时，不应使用身份背书。", replacement:"删除背书，改成具体展示产品设计、参数或真实使用体验。" },
  { category:"夸大防护", riskType:"广告夸大", level:"高", terms:["摔不坏","砸不坏","永不碎","绝对防摔","防爆","无敌","坚不可摧","不会刮花","屏幕毫发无损","indestructible","irrompible","nunca se rompe","a prueba de todo","no se raya","unbreakable","scratch proof"], suggestion:"无条件防护承诺无法覆盖所有跌落高度、角度和使用环境。", replacement:"改成“提升日常抗刮、抗冲击能力”，并注明演示条件。" },
  { category:"疾病治疗宣称", riskType:"医疗功效", level:"高", terms:["治疗","治愈","根治","消炎","杀菌","抗菌","修复疾病","医学证明","cura","curar","tratamiento","elimina bacterias","antibacteriano","médicamente probado","cure","treat","kills bacteria","medical proof"], suggestion:"普通消费品不应宣称治疗疾病、杀菌或替代医疗行为。", replacement:"删除治疗表达，只描述经证实的清洁、护理或使用体验。" },
  { category:"虚假紧迫", riskType:"促销合规", level:"中", terms:["最后一天","仅限今天","马上涨价","最后一批","只剩最后","再不买就没了","último día","solo hoy","últimas unidades","se acaba ahora","last day","today only","last units"], suggestion:"紧迫信息必须与真实库存或活动时间一致。", replacement:"改成“活动和库存以商品页面实时显示为准”，或写明真实截止日期。" },
  { category:"价格与赠品", riskType:"促销合规", level:"中", terms:["全网最低","最低价","免费送","白送","零元","不要钱","precio más bajo","el más barato","gratis","regalo gratis","lowest price","cheapest","free gift","completely free"], suggestion:"最低价、免费和赠品需要明确适用条件及价格依据。", replacement:"改成“符合页面活动条件可获赠”，并标明期限、门槛和适用商品。" },
  { category:"结果保证", riskType:"广告夸大", level:"中", terms:["保证有效","保证成功","一次成功","任何人都能","所有人都适用","效果立刻","resultados garantizados","funciona para todos","resultado inmediato","guaranteed results","works for everyone","instant result"], suggestion:"个体操作和实际效果存在差异，不宜承诺人人都能得到相同结果。", replacement:"改成“操作更容易”“本次演示一次完成”“实际效果因使用情况而异”。" },
  { category:"高风险动作", riskType:"危险演示", level:"中", terms:["斧头","电钻","刀片","锤子砸","火烧","高空抛下","hacha","taladro","cuchilla","martillo","fuego","axe","drill","blade","hammer","fire test"], suggestion:"暴力或危险测试可能引发模仿，也可能被判定为不安全行为。", replacement:"优先使用钥匙、硬币等低风险日常场景；确需测试时注明专业受控环境、请勿模仿。" },
  { category:"对比贬损", riskType:"平台违规", level:"中", terms:["垃圾产品","都是骗局","偷工减料","假货","抄袭","骗子品牌","scam","fake product","producto basura","estafa"], suggestion:"无法举证的贬损、欺诈或假货指控可能造成投诉。", replacement:"改成客观同条件对比，只描述可观察到的差异，不评价品牌动机。" },
  { category:"防护性能", riskType:"广告夸大", level:"低", terms:["抗冲击","耐刮","防窥","疏水疏油","防指纹","shock resistant","scratch resistant","privacy protection","resistente a impactos","resistente a rayones","privacidad"], suggestion:"这类卖点可以使用，但最好有参数、演示或测试依据。", replacement:"保留卖点，同时补充测试条件、角度或使用场景，避免扩大为绝对保证。" },
  { category:"一般紧迫用语", riskType:"促销合规", level:"低", terms:["库存有限","限时优惠","活动价","数量有限","stock limitado","oferta limitada","limited stock","limited offer"], suggestion:"属于常见促销用语，但发布时应确保页面确有对应活动或库存依据。", replacement:"补充真实活动期限，或写成“库存与优惠以商品页面显示为准”。" },
];

export function checkCompliance(text:string):ComplianceHit[] {
  const normalized = text.toLowerCase();
  return rules.flatMap(rule => rule.terms
    .filter(term => normalized.includes(term.toLowerCase()))
    .map(term => ({ category:rule.category, riskType:rule.riskType, level:rule.level, term, suggestion:rule.suggestion, replacement:rule.replacement })));
}

export function getGenerationComplianceKnowledge() {
  return {
    highRiskExpressions:[...new Set(rules.filter(rule=>rule.level==="高").flatMap(rule=>rule.terms))],
    platformConstraints:[...new Set(rules.map(rule=>`${rule.category}：${rule.suggestion}`))],
  };
}
