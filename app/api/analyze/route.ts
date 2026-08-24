import {normalizeAnalysis,type AnalysisInput} from "../../viral-analysis";
import {callProvider,DEFAULT_PROVIDER,getProviderStatuses,ProviderCallError} from "../../provider-router";

export const runtime="nodejs";
function valid(value:unknown):value is AnalysisInput{return Boolean(value&&typeof value==="object"&&typeof (value as AnalysisInput).sourceText==="string"&&(value as AnalysisInput).sourceText.trim().length>=20&&["copy","transcript"].includes((value as AnalysisInput).inputType));}

type StructuredJsonErrorCategory="structured_json_empty"|"structured_json_truncated"|"structured_json_invalid"|"structured_json_shape";
class StructuredJsonError extends Error{
  constructor(public category:StructuredJsonErrorCategory,public diagnostics:Record<string,unknown>={}){super(category);this.name="StructuredJsonError";}
}

function findJsonObject(source:string){
  const start=source.indexOf("{");
  if(start<0)return null;
  let depth=0,inString=false,escaped=false;
  for(let index=start;index<source.length;index+=1){
    const character=source[index];
    if(inString){
      if(escaped)escaped=false;
      else if(character==="\\")escaped=true;
      else if(character==='"')inString=false;
      continue;
    }
    if(character==='"'){inString=true;continue;}
    if(character==="{")depth+=1;
    if(character==="}"){
      depth-=1;
      if(depth===0)return source.slice(start,index+1);
    }
  }
  throw new StructuredJsonError("structured_json_truncated",{contentLength:source.length,jsonStart:start,finishReason:"length_inferred"});
}

export function parseAnalyzerJson(content:string):Record<string,unknown>{
  const trimmed=content.replace(/^\uFEFF/,"").trim();
  if(!trimmed)throw new StructuredJsonError("structured_json_empty",{contentLength:0,finishReason:"empty_content"});
  const fenced=trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
  const candidates=[trimmed,fenced,findJsonObject(fenced??trimmed)].filter((value,index,all):value is string=>Boolean(value)&&all.indexOf(value)===index);
  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate) as unknown;
      if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))return parsed as Record<string,unknown>;
      throw new StructuredJsonError("structured_json_shape",{contentLength:trimmed.length,parsedType:Array.isArray(parsed)?"array":typeof parsed});
    }catch(error){if(error instanceof StructuredJsonError)throw error;}
  }
  throw new StructuredJsonError("structured_json_invalid",{contentLength:trimmed.length,hasJsonStart:trimmed.includes("{"),hasMarkdownFence:/^```/i.test(trimmed)});
}

function testResponse(attempt:number){
  if(process.env.ANALYZE_TEST_MODE!=="1")return null;
  if(process.env.ANALYZE_TEST_RESPONSES){
    const responses=JSON.parse(process.env.ANALYZE_TEST_RESPONSES) as string[];
    return responses[Math.min(attempt-1,responses.length-1)]??"";
  }
  return process.env.ANALYZE_TEST_RESPONSE??"";
}

async function callAnalysisProvider(input:AnalysisInput,prompt:string,attempt:number){
  const fixture=testResponse(attempt);
  if(fixture!==null)return fixture;
  if(!getProviderStatuses()[DEFAULT_PROVIDER].configured)throw new Error("provider_unavailable");
  const result=await callProvider({provider:DEFAULT_PROVIDER,messages:[{role:"system",content:prompt},{role:"user",content:`分析以下${input.inputType==="transcript"?"Transcript":"文案"}：\n\n${input.sourceText}`}],temperature:.3,maxTokens:6000,timeoutMs:60000});
  return result.content;
}

async function requestStructuredAnalysis(input:AnalysisInput,prompt:string){
  for(let attempt=1;attempt<=2;attempt+=1){
    try{
      const content=await callAnalysisProvider(input,prompt,attempt);
      return parseAnalyzerJson(content);
    }
    catch(error){
      const retryableProviderError=error instanceof ProviderCallError&&(["provider_http_error","rate_limit","timeout","empty_result","json_parse_error"] as const).includes(error.category as "provider_http_error"|"rate_limit"|"timeout"|"empty_result"|"json_parse_error");
      if((!(error instanceof StructuredJsonError)&&!retryableProviderError)||attempt===2){
        if(error instanceof StructuredJsonError)error.diagnostics={...error.diagnostics,attempt,maxAttempts:2};
        throw error;
      }
      console.warn("[analyze.retry]",JSON.stringify({category:classifyError(error),attempt,nextAttempt:attempt+1,...diagnosticsFor(error)}));
    }
  }
  throw new StructuredJsonError("structured_json_invalid");
}

function classifyError(error:unknown){
  if(error instanceof StructuredJsonError)return error.category;
  if(error instanceof ProviderCallError)return error.category;
  if(error instanceof Error&&error.message==="provider_unavailable")return"provider_unavailable";
  return"analysis_processing_error";
}
function diagnosticsFor(error:unknown){
  if(error instanceof StructuredJsonError)return error.diagnostics;
  if(error instanceof ProviderCallError)return{providerStatus:error.status??null};
  return{};
}
export async function POST(request:Request){try{const body=await request.json();if(!valid(body))return Response.json({error:"请提供至少20字的文案或Transcript"},{status:400});
  const visual=Boolean(body.visualNotes?.trim());
  const prompt=`你是 ViralFlow Viral Analyzer，分析短视频文案/Transcript为什么可能有效，而不是做摘要。严格返回JSON对象，不输出Markdown。字段必须为：summary,contentType,targetAudience,corePromise,creativeAngle,hook{original,type,mechanism,informationGap,conflict,curiosity,promise,payoff,whyItWorks},structure[{stage,content,purpose,viewerPsychology}],pacing{assessment,retentionBeats[]},emotionCurve[{stage,emotion,trigger}],sellingPoints[{point,priority,evidence}],proofMechanisms[{type,content,observed}],objections[],productReveal,cta,ctaStyle,viralMechanisms[],reusableFormula[],replicationNotes{visualSuggestions[],copySuggestions[],editingSuggestions[]},risks[],timeline[{start,end,stage,spokenContent,visualDescription,editingNote,purpose,retentionMechanism}]。
硬规则：1) 只把输入中存在的内容当Observed；AI判断和复刻建议必须分离。2) ${visual?"用户提供了画面描述，只能基于该描述分析画面":"没有可靠画面信息，所有timeline.visualDescription和editingNote必须写unknown / not provided；可以把画面/剪辑想法仅放在replicationNotes"}。3) Proof只有原文真实存在才能observed=true。4) 不虚构播放量、留存率、GMV、画面、参数、认证或产品能力。5) 有时长无时间戳时只做估算，不声称精确。6) Formula提炼机制，不复制原句。输入上下文：平台=${body.platform||"未提供"}；市场=${body.market||"未提供"}；语言=${body.language||"自动识别"}；时长=${body.durationSeconds||"未提供"}秒；产品=${body.product||"未提供"}；品类=${body.category||"未提供"}；用户画面描述=${body.visualNotes||"未提供"}。`;
  const raw=await requestStructuredAnalysis(body,prompt);const analysis=normalizeAnalysis(raw,body);return Response.json({analysis,provider:DEFAULT_PROVIDER,guards:{observedSeparated:true,visualClaimsGuarded:!visual,timelineLabeled:true}});
}catch(error){const category=classifyError(error);console.error("[analyze.error]",JSON.stringify({category,...diagnosticsFor(error)}));return Response.json({error:category==="provider_unavailable"?"AI Provider未配置":"爆款分析暂时失败，请重试"},{status:category==="provider_unavailable"?503:502});}}
