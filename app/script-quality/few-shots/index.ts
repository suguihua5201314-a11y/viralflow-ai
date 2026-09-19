export type ScriptQualityFewShot = {
  id:string;
  market:string;
  language:string;
  productCategory:string;
  approvedBy:string;
  input:string;
  output:string;
};

// Intentionally empty until a human-approved TikTok UGC example library exists.
const approvedFewShots:ScriptQualityFewShot[]=[];

export function getScriptQualityFewShots(input:{market:string;language:string;productCategory?:string},limit=2){
  return approvedFewShots
    .filter(item=>item.market===input.market&&item.language===input.language&&(!input.productCategory||item.productCategory===input.productCategory))
    .slice(0,Math.max(0,limit));
}

