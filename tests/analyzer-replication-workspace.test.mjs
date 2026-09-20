import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL(`../app/${file}`,import.meta.url),"utf8");
const analyzer=read("viral-analyzer.tsx"),replication=read("viral-replication.tsx"),page=read("page.tsx"),restore=read("analyzer-replication-workspace.ts"),sidebar=read("components/layout/sidebar.tsx"),css=read("styles/analyzer-replication-workspace.css");

test("A Analyzer is workspace-first",()=>{assert.match(analyzer,/analyzer-workspace/);assert.match(analyzer,/VIRAL INSIGHT WORKSPACE/);assert.match(analyzer,/AI INSIGHT ASSISTANT/);assert.match(analyzer,/还没有爆款分析/)});
test("B/C both ViralAnalysisResult and ViralCase restore",()=>{assert.match(restore,/analysisLike\(asset\)/);assert.match(restore,/object\(asset\.source\)&&analysisLike\(asset\.analysis\)/);assert.match(restore,/adaptLegacyCases\(\[asset\]\)/)});
test("D Analyzer sends a stable current-project case to Replication",()=>{for(const marker of ["buildAnalyzerAsset","onResult?.(item)","onReplicate(currentCase)","replicationResult:{sourceId:item.id,source:item}"])assert.ok(`${analyzer}\n${page}`.includes(marker),marker)});
test("E Replication renders real Original to Product mappings",()=>{for(const marker of ["Hook Mechanism","Original Problem","Proof Function","Selling Function","CTA Mechanism","strategy.proofMapping","strategy.sellingPointMapping"])assert.ok(replication.includes(marker),marker)});
test("F Concept Rail is limited to engine A/B/C",()=>{for(const marker of ["Faithful Mechanism","Product Native","Creative Mutation","candidates.slice(0,3)"])assert.ok(replication.includes(marker),marker);assert.doesNotMatch(replication,/Concept D|Concept E/)});
test("G Adopt merges and preserves workspace strategy candidates and mapping",()=>{for(const marker of ["...previous,...workspace","strategy?:ReplicationStrategy","candidates?:ReplicationCandidate","adoptedCandidate","adoptedScript"])assert.ok(restore.includes(marker),marker);assert.match(page,/mergeReplicationAdoption/)});
test("H Replication to Script reuses current pipeline",()=>{for(const marker of ["setResult(adopted)","scriptVersions","currentScript:adopted","setActive(next)"])assert.ok(page.includes(marker),marker)});
test("I/J project assets drive Analyzer and Replication refresh recovery",()=>{for(const marker of ["restoreProjectAnalyzer(currentDirectorProject)","restoreProjectReplication(currentDirectorProject)","initialCase={currentAnalyzerCase}","initialAsset={currentReplicationWorkspace}"])assert.ok(page.includes(marker),marker)});
test("K project switch resets internal component state",()=>{assert.match(analyzer,/\[projectId,initialCase\?\.id/);assert.match(replication,/\[projectId,initialAsset\]/);assert.match(page,/setReplicationCase\(null\)/)});
test("L global viralCases require active library selection",()=>{assert.match(replication,/showLibrary/);assert.match(replication,/案例库 · 仅主动选择/);assert.match(replication,/restoredSource=initialAsset\?\.source\|\|initialCase/)});
test("M project mode is shared without changing schemas",()=>{assert.match(sidebar,/active==="breakdown"\|\|active==="replicate"/);assert.match(page,/active==="breakdown"\|\|active==="replicate"/);assert.doesNotMatch(restore,/PROJECT_MEMORY_VERSION|ProjectAssetBundle\s*=/)});
test("N Workspace CSS is scoped and responsive",()=>{for(const marker of [".analyzer-workspace",".replication-workspace",".insight-assistant",".replication-assistant","@media(max-width:1180px)"])assert.ok(css.includes(marker),marker);assert.doesNotMatch(css,/body\s+\.vr-|!important/)});
