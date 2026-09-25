import type {ProviderErrorType,ProviderId,ProviderStatus} from "./provider-types";

export const DEFAULT_PROVIDER:ProviderId="doubao";

export class ProviderCallError extends Error{
 category:ProviderErrorType;status?:number;
 constructor(category:ProviderErrorType,message:string,status?:number){super(message);this.category=category;this.status=status;this.name="ProviderCallError";}
}
export type ProviderRequest={provider:ProviderId;messages:Array<{role:"system"|"user";content:string}>;temperature:number;topP?:number;maxTokens:number;timeoutMs?:number;thinking?:"enabled"|"disabled"|"auto";purpose?:string;candidateCount?:number};
export type ProviderResponse={content:string;responseTimeMs:number;finishReason:string|null;status:number};
type ProviderTimingStage="configuration"|"waiting_for_headers"|"waiting_for_body"|"response_http"|"response_parse"|"completed";
const DEEPSEEK_URL="https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL="deepseek-v4-pro";
const ARK_CHAT_URL="https://ark.cn-beijing.volces.com/api/v3/chat/completions";

function deepSeekConfig(){return{apiKey:process.env.DEEPSEEK_API_KEY?.trim()||"",model:DEEPSEEK_MODEL,baseUrl:DEEPSEEK_URL};}
function doubaoConfig(){return{apiKey:process.env.ARK_API_KEY?.trim()||"",model:(process.env.ARK_MODEL_ID||process.env.ARK_ENDPOINT_ID)?.trim()||"",baseUrl:process.env.ARK_BASE_URL?.trim()||ARK_CHAT_URL};}
function openAIConfig(){return{apiKey:process.env.OPENAI_API_KEY?.trim()||"",model:process.env.OPENAI_MODEL?.trim()||"",baseUrl:process.env.OPENAI_BASE_URL?.trim()||"https://api.openai.com/v1/chat/completions"};}
export function getProviderStatuses():Record<ProviderId,ProviderStatus>{
 const deepseek=deepSeekConfig(),doubao=doubaoConfig(),openai=openAIConfig();
 const missing=[!doubao.apiKey&&"ARK_API_KEY",!doubao.model&&"ARK_MODEL_ID / ARK_ENDPOINT_ID"].filter(Boolean) as string[];
 const openAIMissing=[!openai.apiKey&&"OPENAI_API_KEY",!openai.model&&"OPENAI_MODEL"].filter(Boolean) as string[];
 return{
  deepseek:{id:"deepseek",label:"DeepSeek",configured:Boolean(deepseek.apiKey),state:deepseek.apiKey?"connected":"unconfigured",model:deepseek.apiKey?deepseek.model:null,baseUrl:deepseek.apiKey?deepseek.baseUrl:null,missingFields:deepseek.apiKey?[]:["DEEPSEEK_API_KEY"]},
  doubao:{id:"doubao",label:"豆包",configured:missing.length===0,state:missing.length?"unconfigured":"connected",model:doubao.model||null,baseUrl:doubao.baseUrl||null,missingFields:missing},
  openai:{id:"openai",label:"GPT",configured:openAIMissing.length===0,state:openAIMissing.length?"unconfigured":"connected",model:openai.model||null,baseUrl:openai.baseUrl||null,missingFields:openAIMissing},
 };
}
function classifyStatus(status:number){if(status===401||status===403)return"unauthorized";if(status===404||status===400)return"invalid_model_or_endpoint";if(status===429)return"rate_limit";return"provider_http_error";}
function timingLog(event:Record<string,unknown>){console.log(JSON.stringify({scope:"provider_timing",...event}));}
function isAbort(error:unknown){return error instanceof Error&&(error.name==="AbortError"||/timeout|aborted/i.test(error.message));}
function safePurpose(value?:string){return value?.trim().slice(0,80)||"provider-call";}

export async function callProvider(request:ProviderRequest):Promise<ProviderResponse>{
 const correlationId=globalThis.crypto.randomUUID();
 const requestStarted=Date.now();
 const timeoutMs=request.timeoutMs??45000;
 const inputChars=request.messages.reduce((sum,message)=>sum+message.content.length,0);
 const common={correlationId,provider:request.provider,purpose:safePurpose(request.purpose)};
 timingLog({...common,event:"request_started",at:new Date(requestStarted).toISOString(),timeoutMs,maxTokens:request.maxTokens,candidateCount:request.candidateCount??null,inputChars,approxInputTokens:Math.ceil(inputChars/4)});
 const statuses=getProviderStatuses(),status=statuses[request.provider];
 if(!status.configured){
  timingLog({...common,event:"provider_failure",stage:"configuration" satisfies ProviderTimingStage,errorType:"missing_field",elapsedMs:Date.now()-requestStarted,modelConfigured:Boolean(status.model)});
  throw new ProviderCallError("missing_field",`${status.label}未配置`);
 }
 const config=request.provider==="deepseek"?deepSeekConfig():request.provider==="openai"?openAIConfig():doubaoConfig();
 const {baseUrl:url,model,apiKey}=config;
 const fetchStarted=Date.now();
 timingLog({...common,event:"fetch_started",fetchStartedAt:new Date(fetchStarted).toISOString(),modelConfigured:Boolean(model)});
 let response:Response;
 try{
  response=await fetch(url,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(timeoutMs),body:JSON.stringify({model,messages:request.messages,response_format:{type:"json_object"},temperature:request.temperature,...(request.topP!==undefined?{top_p:request.topP}:{}),...(request.provider==="openai"?{max_completion_tokens:request.maxTokens}:{max_tokens:request.maxTokens}),...(request.thinking?{thinking:{type:request.thinking}}:request.provider==="deepseek"?{thinking:{type:"disabled"}}:{})})});
 }catch(error){
  const errorType:ProviderErrorType=isAbort(error)?"timeout":"provider_http_error";
  timingLog({...common,event:"provider_failure",stage:"waiting_for_headers" satisfies ProviderTimingStage,errorType,elapsedMs:Date.now()-fetchStarted,headersReceived:false,httpStatus:null});
  throw new ProviderCallError(errorType,errorType==="timeout"?`${status.label}请求超时`:`${status.label}网络请求失败`);
 }
 const headersReceived=Date.now();
 const contentType=response.headers.get("content-type")?.slice(0,120)||null;
 timingLog({...common,event:"headers_received",headersReceivedAt:new Date(headersReceived).toISOString(),elapsedToHeadersMs:headersReceived-fetchStarted,httpStatus:response.status,contentType});
 let text:string;
 try{text=await response.text();}
 catch(error){
  const errorType:ProviderErrorType=isAbort(error)?"timeout":"provider_http_error";
  timingLog({...common,event:"provider_failure",stage:"waiting_for_body" satisfies ProviderTimingStage,errorType,elapsedToHeadersMs:headersReceived-fetchStarted,elapsedMs:Date.now()-fetchStarted,headersReceived:true,httpStatus:response.status,contentType});
  throw new ProviderCallError(errorType,errorType==="timeout"?`${status.label}请求超时`:`${status.label}网络请求失败`,response.status);
 }
 const bodyCompleted=Date.now();
 timingLog({...common,event:"body_completed",bodyCompletedAt:new Date(bodyCompleted).toISOString(),elapsedToHeadersMs:headersReceived-fetchStarted,elapsedToBodyMs:bodyCompleted-fetchStarted,httpStatus:response.status,contentType,responseChars:text.length});
 if(!response.ok){
  const errorType=classifyStatus(response.status);
  timingLog({...common,event:"provider_failure",stage:"response_http" satisfies ProviderTimingStage,errorType,elapsedMs:bodyCompleted-fetchStarted,httpStatus:response.status});
  throw new ProviderCallError(errorType,`${status.label} HTTP ${response.status}`,response.status);
 }
 if(!text.trim()){
  timingLog({...common,event:"provider_failure",stage:"response_parse" satisfies ProviderTimingStage,errorType:"empty_result",elapsedMs:bodyCompleted-fetchStarted,httpStatus:response.status});
  throw new ProviderCallError("empty_result",`${status.label}响应为空`,response.status);
 }
 let data:{choices?:Array<{message?:{content?:string};finish_reason?:string|null}>};
 try{data=JSON.parse(text) as typeof data;}
 catch{
  timingLog({...common,event:"provider_failure",stage:"response_parse" satisfies ProviderTimingStage,errorType:"json_parse_error",elapsedMs:bodyCompleted-fetchStarted,httpStatus:response.status});
  throw new ProviderCallError("json_parse_error",`${status.label}响应不是有效JSON`,response.status);
 }
 const content=data.choices?.[0]?.message?.content;
 if(!content?.trim()){
  timingLog({...common,event:"provider_failure",stage:"response_parse" satisfies ProviderTimingStage,errorType:"empty_result",elapsedMs:bodyCompleted-fetchStarted,httpStatus:response.status});
  throw new ProviderCallError("empty_result",`${status.label}没有返回内容`,response.status);
 }
 timingLog({...common,event:"provider_success",stage:"completed" satisfies ProviderTimingStage,elapsedToHeadersMs:headersReceived-fetchStarted,elapsedToBodyMs:bodyCompleted-fetchStarted,totalElapsedMs:Date.now()-requestStarted,httpStatus:response.status,contentType,responseChars:text.length});
 return{content,responseTimeMs:Date.now()-requestStarted,finishReason:data.choices?.[0]?.finish_reason||null,status:response.status};
}
