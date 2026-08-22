export type ScriptLanguageInput={
 title?:string;hook?:string;alternateHooks?:string[];narration?:string;conflict?:string;
 productReveal?:string;proof?:string;sellingPoints?:string;cta?:string;shootingSuggestion?:string;
 scenes?:Array<{line?:string}>;
};

export type LanguageGuardResult={passed:boolean;targetLanguage:string;offendingFields:string[];reasons:string[]};

const languageAliases:Record<string,string>={
 "西班牙语":"spanish",spanish:"spanish",español:"spanish",espanol:"spanish",
 "英语":"english",english:"english",
 "意大利语":"italian",italian:"italian",italiano:"italian",
 "法语":"french",french:"french",français:"french",francais:"french",
 "德语":"german",german:"german",deutsch:"german",
 "葡萄牙语":"portuguese",portuguese:"portuguese",português:"portuguese",portugues:"portuguese",
};
const latinTargets=new Set(["spanish","english","italian","french","german","portuguese"]);
const markers:Record<string,Set<string>>={
 spanish:new Set("el la los las un una que por para con sin este esta como pero si porque muy más ya te lo se del al".split(" ")),
 english:new Set("the a an that why for with without this these how but if because very more now you it is are of to".split(" ")),
 italian:new Set("il lo la i gli le un una che per con senza questo questa come ma se perché molto più già".split(" ")),
 french:new Set("le la les un une que pour avec sans ce cette comme mais si parce très plus déjà vous est sont de".split(" ")),
 german:new Set("der die das ein eine dass warum für mit ohne dieser diese wie aber wenn weil sehr mehr jetzt ist sind".split(" ")),
 portuguese:new Set("o a os as um uma que por para com sem este esta como mas se porque muito mais já você é são".split(" ")),
};

function normalizeTarget(value:string){return languageAliases[value.trim().toLowerCase()]||value.trim().toLowerCase()||"unknown";}
function userFacingFields(script:ScriptLanguageInput){
 const values:Array<[string,string|undefined]>=[
  ["title",script.title],["hook",script.hook],["narration",script.narration],["conflict",script.conflict],
  ["productReveal",script.productReveal],["proof",script.proof],["sellingPoints",script.sellingPoints],
  ["cta",script.cta],["shootingSuggestion",script.shootingSuggestion],
  ...(script.alternateHooks||[]).map((value,index)=>[`alternateHooks.${index}`,value] as [string,string]),
  ...(script.scenes||[]).map((scene,index)=>[`scenes.${index}.line`,scene.line] as [string,string|undefined]),
 ];
 return values.filter((entry):entry is [string,string]=>Boolean(entry[1]?.trim()));
}
function markerCount(text:string,language:string){
 const words=text.toLowerCase().normalize("NFKD").replace(/[^\p{L}]+/gu," ").trim().split(/\s+/).filter(Boolean);
 const set=markers[language];return set?words.reduce((total,word)=>total+(set.has(word)?1:0),0):0;
}

export function validateScriptLanguage(script:ScriptLanguageInput,requestedLanguage:string):LanguageGuardResult{
 const targetLanguage=normalizeTarget(requestedLanguage),fields=userFacingFields(script),offending=new Set<string>(),reasons:string[]=[];
 if(!latinTargets.has(targetLanguage))return{passed:true,targetLanguage,offendingFields:[],reasons:[]};
 for(const [name,value] of fields)if((value.match(/\p{Script=Han}/gu)||[]).length>=2)offending.add(name);
 if(offending.size)reasons.push("latin_output_contains_han_script");
 const combined=fields.map(([,value])=>value).join(" ");
 const targetMarkers=markerCount(combined,targetLanguage);
 const strongestCompetitor=Object.keys(markers).filter(language=>language!==targetLanguage).map(language=>({language,count:markerCount(combined,language)})).sort((a,b)=>b.count-a.count)[0];
 if(strongestCompetitor&&strongestCompetitor.count>=8&&strongestCompetitor.count>targetMarkers*1.35){
  reasons.push(`dominant_${strongestCompetitor.language}_markers`);fields.forEach(([name])=>offending.add(name));
 }
 return{passed:reasons.length===0,targetLanguage,offendingFields:[...offending],reasons};
}
