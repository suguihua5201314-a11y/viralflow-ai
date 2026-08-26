import type {ProviderErrorType,ProviderId,ProviderStatus} from "./provider-types";

export const DEFAULT_PROVIDER:ProviderId="doubao";

export class ProviderCallError extends Error{
 constructor(public category:ProviderErrorType,message:string,public status?:number){super(message);this.name="ProviderCallError";}
}
type ProviderRequest={provider:ProviderId;messages:Array<{role:"system"|"user";content:string}>;temperature:number;maxTokens:number;timeoutMs?:number;thinking?:"enabled"|"disabled"|"auto"};
type ProviderResponse={content:string;responseTimeMs:number;finishReason:string|null;status:number};
const DEEPSEEK_URL="https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL="deepseek-v4-pro";
const ARK_CHAT_URL="https://ark.cn-beijing.volces.com/api/v3/chat/completions";

function deepSeekConfig(){return{apiKey:process.env.DEEPSEEK_API_KEY?.trim()||"",model:DEEPSEEK_MODEL,baseUrl:DEEPSEEK_URL};}
function doubaoConfig(){return{apiKey:process.env.ARK_API_KEY?.trim()||"",model:(process.env.ARK_MODEL_ID||process.env.ARK_ENDPOINT_ID)?.trim()||"",baseUrl:process.env.ARK_BASE_URL?.trim()||ARK_CHAT_URL};}
export function getProviderStatuses():Record<ProviderId,ProviderStatus>{
 const deepseek=deepSeekConfig(),doubao=doubaoConfig();
 const missing=[!doubao.apiKey&&"ARK_API_KEY",!doubao.model&&"ARK_MODEL_ID / ARK_ENDPOINT_ID"].filter(Boolean) as string[];
 return{
  deepseek:{id:"deepseek",label:"DeepSeek",configured:Boolean(deepseek.apiKey),state:deepseek.apiKey?"connected":"unconfigured",model:deepseek.apiKey?deepseek.model:null,baseUrl:deepseek.apiKey?deepseek.baseUrl:null,missingFields:deepseek.apiKey?[]:["DEEPSEEK_API_KEY"]},
  doubao:{id:"doubao",label:"豆包",configured:missing.length===0,state:missing.length?"unconfigured":"connected",model:doubao.model||null,baseUrl:doubao.baseUrl||null,missingFields:missing},
  openai:{id:"openai",label:"GPT",configured:false,state:"unconfigured",model:null,baseUrl:null,missingFields:["OpenAIProvider 尚未实现（本阶段不读取 OPENAI_API_KEY）"]},
 };
}
function classifyStatus(status:number){if(status===401||status===403)return"unauthorized";if(status===404||status===400)return"invalid_model_or_endpoint";if(status===429)return"rate_limit";return"provider_http_error";}
export async function callProvider(request:ProviderRequest):Promise<ProviderResponse>{
 const statuses=getProviderStatuses(),status=statuses[request.provider];
 if(!status.configured)throw new ProviderCallError("missing_field",`${status.label}未配置`);
 if(request.provider==="openai")throw new ProviderCallError("missing_field","OpenAIProvider尚未实现");
 const config=request.provider==="deepseek"?deepSeekConfig():doubaoConfig();
 const {baseUrl:url,model,apiKey}=config;
 const started=Date.now();let response:Response;
 try{response=await fetch(url,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(request.timeoutMs??45000),body:JSON.stringify({model,messages:request.messages,response_format:{type:"json_object"},temperature:request.temperature,max_tokens:request.maxTokens,...(request.thinking?{thinking:{type:request.thinking}}:request.provider==="deepseek"?{thinking:{type:"disabled"}}:{})})});}
 catch(error){if(error instanceof Error&&(error.name==="AbortError"||/timeout|aborted/i.test(error.message)))throw new ProviderCallError("timeout",`${status.label}请求超时`);throw new ProviderCallError("provider_http_error",`${status.label}网络请求失败`);}
 const text=await response.text();
 if(!response.ok)throw new ProviderCallError(classifyStatus(response.status),`${status.label} HTTP ${response.status}`,response.status);
 if(!text.trim())throw new ProviderCallError("empty_result",`${status.label}响应为空`,response.status);
 let data:{choices?:Array<{message?:{content?:string};finish_reason?:string|null}>};try{data=JSON.parse(text) as typeof data;}catch{throw new ProviderCallError("json_parse_error",`${status.label}响应不是有效JSON`,response.status);}
 const content=data.choices?.[0]?.message?.content;if(!content?.trim())throw new ProviderCallError("empty_result",`${status.label}没有返回内容`,response.status);
 return{content,responseTimeMs:Date.now()-started,finishReason:data.choices?.[0]?.finish_reason||null,status:response.status};
}
