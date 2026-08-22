import { buildKnowledgeContext, renderKnowledgeContext, type ProductKnowledge, type SellingPointKnowledge } from "../../knowledge-context";
import { getGenerationComplianceKnowledge } from "../../compliance-rules";
import { isCopilotBlockKey, requestedCopilotKeys, validateCopilotCandidate, type CopilotBlock, type CopilotBlockKey, type CopilotMode } from "../../copilot-core";

export const runtime="nodejs";

type ScriptContext={title?:string;creativeAngle?:string;hookType?:string;framework?:string;style?:string;conflict?:string;productReveal?:string;proof?:string;sellingPoints?:string;cta?:string};
type Payload={
  mode:CopilotMode; targetKey?:string; action?:string; instruction?:string; blocks:CopilotBlock[]; lockedKeys:string[];
  script:ScriptContext; product:string; sellingPoints:string; audience:string; country:string; language:string; offer:string;
  platform?:string; creationMode?:string; hookStrategy?:string; framework?:string; creativity?:string;
  productKnowledge?:ProductKnowledge; sellingPointKnowledge?:SellingPointKnowledge[];
};
type ProviderResult={blocks:Array<{key:string;text:string}>};

const actionGuidance:Record<string,string>={
  "更吸睛":"增强前三秒的信息缺口、反差或观看理由，但不得使用通用广告套话。",
  "更自然":"像目标市场普通用户真实聊天，减少广告腔和书面翻译腔。",
  "更 KOC / UGC":"改成第一人称真实体验，克制销售感，不虚构使用经历或结果。",
  "加强冲突":"强化可观察的问题或前后差异，不虚构竞品结论或危险测试。",
  "更简短":"压缩为更短的一句或最少必要句，保留核心事实。",
  "更口语":"使用目标市场真人常用的短句与停顿感。",
  "加强 Proof / 证明":"增加可拍、可观察的演示逻辑，只能证明已提供的卖点。",
  "更强转化":"给出更自然明确的行动理由，只能使用已提供的真实促销信息。",
};
const blockGuidance:Record<CopilotBlockKey,string>={
  hook:"只优化开头及前三秒观看理由；不要提前讲完整正文。", conflict:"只优化问题、冲突或观看理由，并承接现有Hook。",
  product:"只优化产品自然出现与揭晓方式，不新增产品能力。", proof:"只优化演示和证明动作；不得补充未提供的测试结果。",
  points:"只优化卖点表达与递进，围绕Selling Point Priority。", cta:"只优化收口与行动引导；不得新增折扣、价格、赠品或库存事实。",
};

function validPayload(value:unknown):value is Payload {
  if(!value||typeof value!=="object")return false;
  const p=value as Partial<Payload>;
  return (p.mode==="single"||p.mode==="unlocked")&&Array.isArray(p.blocks)&&Array.isArray(p.lockedKeys)&&Boolean(p.product?.trim()&&p.sellingPoints?.trim()&&p.language?.trim());
}

function providerTemperature(creativity?:string){return creativity==="稳定"?0.45:creativity==="激进"?0.85:0.65;}

async function callDeepSeek(payload:Payload,prompt:string):Promise<ProviderResult> {
  if(process.env.COPILOT_TEST_MODE==="1"&&process.env.COPILOT_TEST_RESPONSE)return JSON.parse(process.env.COPILOT_TEST_RESPONSE) as ProviderResult;
  const apiKey=process.env.DEEPSEEK_API_KEY;
  if(!apiKey)throw new Error("provider_unavailable");
  const response=await fetch("https://api.deepseek.com/chat/completions",{
    method:"POST",signal:AbortSignal.timeout(45000),headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},
    body:JSON.stringify({model:"deepseek-v4-pro",messages:[{role:"system",content:prompt},{role:"user",content:"返回本次局部精修候选。"}],thinking:{type:"disabled"},response_format:{type:"json_object"},temperature:providerTemperature(payload.creativity),max_tokens:2200}),
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`provider_http_${response.status}`);
  const envelope=JSON.parse(raw) as {choices?:Array<{message?:{content?:string}}>};
  const content=envelope.choices?.[0]?.message?.content;
  if(!content)throw new Error("provider_empty");
  return JSON.parse(content) as ProviderResult;
}

export async function POST(request:Request) {
  try{
    const body=await request.json();
    if(!validPayload(body))return Response.json({error:"Copilot请求不完整"},{status:400});
    const keys=requestedCopilotKeys(body.mode,body.targetKey,body.blocks,body.lockedKeys);
    if(!keys.length)return Response.json({error:body.mode==="unlocked"?"没有可重写的未锁定Block":"目标Block已锁定或不存在"},{status:400});
    const knowledge=buildKnowledgeContext({...body,platform:body.platform||"TikTok",productKnowledge:body.productKnowledge,sellingPointKnowledge:body.sellingPointKnowledge,complianceKnowledge:getGenerationComplianceKnowledge()});
    const targetLines=keys.map(key=>{const block=body.blocks.find(item=>item.key===key)!;return `- ${key} (${block.label}/${block.type}): ${block.text}`}).join("\n");
    const lockedLines=body.blocks.filter(block=>body.lockedKeys.includes(block.key)).map(block=>`- ${block.key}: ${block.text}`).join("\n")||"无";
    const fullScript=body.blocks.map(block=>`${block.key}: ${block.text}`).join("\n");
    const custom=body.instruction?.trim();
    const action=custom?`用户自定义指令（指令语言不改变输出语言）：${custom}`:`快捷动作：${body.action||"更自然"}。${actionGuidance[body.action||""]||"保持原意并提高表达质量。"}`;
    const prompt=`你是 ViralFlow AI Script Copilot。你只精修指定Script Block，不重写整篇脚本。\n\n硬规则：\n1. 输出必须严格保持${body.language}，即使编辑指令是中文也不能切换语言。\n2. 只返回 requested keys；其它Block和所有Locked Blocks都不得返回或修改。\n3. Locked Blocks是HARD CONSTRAINT，重写后必须与它们逻辑连续。\n4. 只允许使用Knowledge Context中的产品事实、参数、认证、促销、测试和能力；缺失的信息不得补充。\n5. 禁用词、Fact Guard和Compliance Constraints继续生效。\n6. 不解释，不输出Markdown。严格返回JSON：{"blocks":[{"key":"hook","text":"..."}]}。\n\n${renderKnowledgeContext(knowledge)}\n\n[CURRENT SCRIPT]\n${fullScript}\n\n[LOCKED BLOCKS / EXACT HARD CONSTRAINT]\n${lockedLines}\n\n[REQUESTED BLOCKS]\n${targetLines}\n\n[BLOCK-SPECIFIC RULES]\n${keys.map(key=>`- ${key}: ${blockGuidance[key]}`).join("\n")}\n\n[EDIT REQUEST]\n${action}\n\n当前策略上下文：Creative Mode=${body.creationMode||body.script.style||"未指定"}；Hook Strategy=${body.hookStrategy||body.script.hookType||"未指定"}；Framework=${body.framework||body.script.framework||"未指定"}；Creativity=${body.creativity||"平衡"}。`;
    let lastViolations:string[]=[];
    for(let attempt=1;attempt<=2;attempt++){
      const result=await callDeepSeek(body,attempt===1?prompt:`${prompt}\n\n上一次候选未通过保护层：${lastViolations.join("；")}。请只修正这些问题。`);
      const candidate=(result.blocks||[]).filter(item=>isCopilotBlockKey(item.key)&&typeof item.text==="string").map(item=>({...item,key:item.key as CopilotBlockKey,label:body.blocks.find(block=>block.key===item.key)?.label||item.key,type:body.blocks.find(block=>block.key===item.key)?.type||item.key}));
      lastViolations=validateCopilotCandidate({currentBlocks:body.blocks,candidateBlocks:candidate,requestedKeys:keys,lockedKeys:body.lockedKeys,language:body.language,knowledge});
      if(!lastViolations.length)return Response.json({candidate:{blocks:candidate,keys},knowledge:{...knowledge.metadata,sellingPointPriority:knowledge.sellingPointPriority},guards:{fact:true,compliance:true,language:true,locked:true},provider:"deepseek"});
    }
    return Response.json({error:"候选未通过事实、合规或语言保护",details:lastViolations},{status:422});
  }catch(error){
    const message=error instanceof Error?error.message:"copilot_error";
    console.error("[copilot.error]",JSON.stringify({category:message.startsWith("provider_")?message:"validation_or_parse"}));
    return Response.json({error:message==="provider_unavailable"?"AI Provider未配置":"AI局部精修暂时失败，请重试"},{status:message==="provider_unavailable"?503:502});
  }
}
