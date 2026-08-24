import {checkContextIntegrity,directorContextId,fallbackDirector,type DirectorRequest,type DirectorResult} from "./director-core";
import {shotIntelligenceFingerprint,type ShotIntelligenceEvaluation} from "./director-intelligence";
import {workspaceShots} from "./director-workspace";

export const demoDirectorInput:DirectorRequest={
 script:{title:"CrystalArmor iPhone TikTok",hook:"一不小心，屏幕就碎了",narration:"用真实跌落痛点开场，再展示钢化膜、受控防护测试与日常顺滑体验。",creativeAngle:"问题冲击 → 产品证明",hookType:"视觉钩子",framework:"AIDA",style:"产品演示",scenes:[
  {time:"00:00–00:03",visual:"手机从手中滑落，屏幕裂纹微距定格。",line:"一不小心，屏幕就碎了。",edit:"快速推进，在裂纹出现时硬切。"},
  {time:"00:03–00:06",visual:"钢化膜悬浮对位，产品边缘高光清晰可见。",line:"全新升级，强悍防护。",edit:"干净产品揭示。"},
  {time:"00:06–00:10",visual:"受控桌面完成钢球冲击测试，随后扫过完整表面。",line:"可视化验证日常抗冲击表现。",edit:"保留冲击与检查动作。"},
  {time:"00:10–00:13",visual:"水滴和指尖滑过屏幕，表面保持清爽。",line:"日常使用，顺滑又清晰。",edit:"微距慢动作。"},
  {time:"00:13–00:15",visual:"产品与手机同框，回扣开场痛点。",line:"给屏幕多一层日常保护。",edit:"简洁收口。"}
 ]},
 context:{product:"CrystalArmor 钢化膜",sellingPoints:"日常抗冲击；高清通透；疏水疏油；顺滑触控",audience:"重视手机日常保护与屏幕手感的 iPhone 用户",market:"西班牙",language:"中文",platform:"TikTok",targetDuration:15,creativeMode:"产品演示",hookStrategy:"视觉钩子",framework:"AIDA",creativeAngle:"问题冲击 → 产品证明",sourceType:"script-studio"},
 settings:{provider:"doubao",talent:"单人手模",environment:"深色专业产品摄影棚"}
};

const generated=fallbackDirector(demoDirectorInput),contextId=directorContextId(demoDirectorInput),demoShots=workspaceShots(generated.shots.slice(0,5));
const scoreSets=[[92,88,85,90],[78,85,92,80],[90,95,95,92],[75,80,70,85],[84,82,76,91]],evaluatedAt="2026-08-24T09:00:00.000Z";
const intelligence=Object.fromEntries(demoShots.map((shot,index)=>{const values=scoreSets[index]||scoreSets.at(-1)!;const evaluation:ShotIntelligenceEvaluation={shotId:shot.shotId,fingerprint:shotIntelligenceFingerprint(shot,contextId,demoShots[index-1],demoShots[index+1]),scores:{hookStrength:values[0],visualImpact:values[1],productProof:values[2],conversionPotential:values[3]},suggestion:{missing:index===0?"视觉冲击已经明确，但产品解决方案可以更早建立联系。":"镜头职责清晰，可进一步加强与前后镜头的因果衔接。",visualUpgrade:index===0?"增加用户惊讶反应，并在裂纹定格后快速切入产品特写。":"强化动作发生前后的同机位对照，让结果更容易被看懂。",conversionUpgrade:"让产品、用户收益与下一步行动在同一镜头内完成表达。"},evaluatedAt,provider:"doubao"};return[shot.shotId,{status:"success",evaluation}];}));
const result:DirectorResult={...generated,shots:demoShots,metadata:{providerRequested:"doubao",providerUsed:"local",aiGenerated:false,fallbackUsed:true,providerErrorType:null,responseTimeMs:0,targetDuration:15,plannedDuration:15,durationDelta:0,durationRebalanced:false,shotCount:demoShots.length,sourceType:"script-studio",productKnowledgeUsed:false,factGuardPassed:true,contextId,contextIntegrity:checkContextIntegrity(generated,demoDirectorInput,contextId)}};

export const demoDirectorWorkspace={result,shots:demoShots,listStatus:"Draft" as const,selectedShot:0,intelligence,intelligenceMetadata:{providerRequested:"doubao" as const,providerUsed:"cache" as const,responseTimeMs:0,cacheHits:demoShots.length,cacheMisses:0,batchSize:demoShots.length}};
