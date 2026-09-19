export { scriptQualityFewShotLibrary } from "./library";
export { buildFewShotQuery, fewShotSimilarityIssues, inferProductCategory, MIN_RELEVANCE_SCORE, scoreFewShot, selectScriptQualityFewShots } from "./select";
export type { FewShotQuery, FewShotSelectionOptions, FewShotStatus, ScriptQualityFewShot } from "./types";

import { selectScriptQualityFewShots } from "./select";
import type { FewShotQuery, FewShotSelectionOptions } from "./types";

export function getScriptQualityFewShots(query:FewShotQuery,options:FewShotSelectionOptions={}){
  return selectScriptQualityFewShots(query,options);
}
