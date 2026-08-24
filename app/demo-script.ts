import type {StudioScript} from "./script-studio";

export const demoScript:StudioScript={id:7003,title:"CrystalArmor TikTok V3",product:"CrystalArmor 钢化膜",language:"西班牙语",country:"西班牙",style:"产品演示",hook:"一不小心，屏幕就碎了。",alternateHooks:["别等屏幕碎了才想起保护。","这层保护，第一秒就能看懂。"],narration:"一不小心，屏幕就碎了。真正需要保护的不是某一次测试，而是每天放进口袋、拿起和滑落的瞬间。CrystalArmor 对准屏幕后贴合，用清晰特写展示边缘与表面。受控条件下记录保护前、动作过程和检查结果，再用水滴与指尖展示日常顺滑体验。给屏幕多一层日常保护。",creativeAngle:"问题冲击 → 产品证明",hookType:"视觉钩子",framework:"AIDA",conflict:"手机每天都在经历口袋摩擦、桌面碰撞和意外滑落。",productReveal:"CrystalArmor 钢化膜对准屏幕，产品边缘与贴合过程清晰入镜。",proof:"同机位记录测试前、受控动作与测试后表面，随后展示水滴与触控体验。",sellingPoints:"高清通透；日常抗冲击；疏水疏油；顺滑触控",cta:"给屏幕多一层日常保护。",scenes:[{time:"0–3s",visual:"裂纹屏幕微距",line:"一不小心，屏幕就碎了。",edit:"快速推进"},{time:"3–8s",visual:"日常使用与意外滑落",line:"真正需要保护的是每天的意外。",edit:"快切"},{time:"8–15s",visual:"钢化膜对位贴合",line:"CrystalArmor 对准屏幕后贴合。",edit:"产品特写"},{time:"15–24s",visual:"受控测试和水滴演示",line:"用完整过程检查真实表现。",edit:"同机位证明"},{time:"24–30s",visual:"产品与手机同框",line:"给屏幕多一层日常保护。",edit:"干净收口"}],aiGenerated:true,providerRequested:"deepseek",providerUsed:"deepseek",fallbackUsed:false,providerErrorType:null,responseTimeMs:1280};

export const demoScriptVariations:StudioScript[]=[
 demoScript,
 {...demoScript,id:7004,title:"CrystalArmor Strong Conflict",style:"强冲突",hookType:"冲突",hook:"一块普通膜，可能根本扛不住你的日常。",creativeAngle:"强冲突测评"},
 {...demoScript,id:7005,title:"CrystalArmor Product Demo",style:"产品演示",hookType:"结果前置",hook:"先看贴完后的屏幕，再告诉你过程。",creativeAngle:"结果前置演示"},
 {...demoScript,id:7006,title:"CrystalArmor Curiosity",style:"KOC / UGC",hookType:"好奇",hook:"为什么这块屏幕看起来像什么都没贴？",creativeAngle:"信息缺口"},
 {...demoScript,id:7007,title:"CrystalArmor Storytelling",style:"Storytelling",hookType:"问题",hook:"上一次屏幕碎掉后，我改了一个习惯。",creativeAngle:"真实经历"}
];
