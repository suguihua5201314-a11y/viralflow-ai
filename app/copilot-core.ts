import { checkCompliance } from "./compliance-rules";
import { findFactViolations, type KnowledgeContext } from "./knowledge-context";

export const copilotBlockKeys = ["hook","conflict","product","proof","points","cta"] as const;
export type CopilotBlockKey = typeof copilotBlockKeys[number];
export type CopilotBlock = { key:CopilotBlockKey; label:string; type:string; text:string };
export type CopilotMode = "single"|"unlocked";

export function isCopilotBlockKey(value:string):value is CopilotBlockKey {
  return (copilotBlockKeys as readonly string[]).includes(value);
}

export function requestedCopilotKeys(mode:CopilotMode,targetKey:string|undefined,blocks:CopilotBlock[],lockedKeys:string[]) {
  const available=new Set(blocks.map(block=>block.key));
  if(mode==="single")return targetKey&&isCopilotBlockKey(targetKey)&&available.has(targetKey)&&!lockedKeys.includes(targetKey)?[targetKey]:[];
  return copilotBlockKeys.filter(key=>available.has(key)&&!lockedKeys.includes(key));
}

export function validateCopilotCandidate(input:{
  currentBlocks:CopilotBlock[]; candidateBlocks:CopilotBlock[]; requestedKeys:CopilotBlockKey[];
  lockedKeys:string[]; language:string; knowledge:KnowledgeContext;
}) {
  const violations:string[]=[];
  const candidate=new Map(input.candidateBlocks.map(block=>[block.key,block.text.trim()]));
  const requested=new Set(input.requestedKeys);
  if(candidate.size!==input.requestedKeys.length)violations.push("返回的Block数量不完整");
  for(const key of input.requestedKeys)if(!candidate.get(key))violations.push(`缺少目标Block:${key}`);
  for(const key of candidate.keys())if(!requested.has(key))violations.push(`修改了非目标Block:${key}`);
  for(const key of input.lockedKeys)if(isCopilotBlockKey(key)&&candidate.has(key))violations.push(`修改了锁定Block:${key}`);
  const output=input.requestedKeys.map(key=>candidate.get(key)||"").join("\n");
  violations.push(...findFactViolations(output,input.knowledge));
  const highRisk=checkCompliance(output).filter(hit=>hit.level==="高");
  if(highRisk.length)violations.push(...highRisk.map(hit=>`命中高风险表达:${hit.term}`));
  if(input.language!=="中文"&&/[\u3400-\u9fff]/u.test(output))violations.push(`输出未保持${input.language}`);
  if(input.language==="中文"&&!/[\u3400-\u9fff]/u.test(output))violations.push("输出未保持中文");
  return [...new Set(violations)];
}

export function mergeCopilotBlocks(current:CopilotBlock[],candidate:CopilotBlock[],requestedKeys:CopilotBlockKey[]) {
  const changes=new Map(candidate.map(block=>[block.key,block.text.trim()]));
  const allowed=new Set(requestedKeys);
  return current.map(block=>allowed.has(block.key)&&changes.has(block.key)?{...block,text:changes.get(block.key)!}:block);
}
