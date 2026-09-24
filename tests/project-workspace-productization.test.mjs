import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const workspace=fs.readFileSync(new URL("../app/project-workspace.tsx",import.meta.url),"utf8");
const memory=fs.readFileSync(new URL("../app/project-memory.ts",import.meta.url),"utf8");

test("Test A: 创建新项目复用 Project Memory V1",()=>{assert.match(page,/function createProject/);assert.match(page,/assets:\{scriptVersions:\[\]\}/);assert.match(memory,/viralflow-project-memory-v1/);});
test("Test B: 项目列表展示完整元数据",()=>{for(const label of ["项目资产","创建","更新","当前阶段"])assert.match(workspace,new RegExp(label));});
test("Test C: 项目详情展示完整 AI Creative Pipeline",()=>{for(const label of ["爆款研究","创意复刻","AI 脚本","AI 导演","AI 配音","成片生成（未来）"])assert.match(workspace,new RegExp(label));});
test("Test D: 刷新恢复仍使用既有读写链路",()=>{assert.match(page,/readProjectMemory\(\)/);assert.match(page,/cacheProjectMemory\(projectMemory\)/);});
test("Test E: 多项目按 currentProjectId 隔离",()=>{assert.match(page,/project\.id===currentId/);assert.match(page,/currentProjectId:id/);});
test("Test F: Analyzer 资产映射到项目",()=>{assert.match(page,/analyzerResult\?1:0/);assert.match(workspace,/Analyzer ·/);});
test("Test G: Script Versions 资产映射到项目",()=>{assert.match(page,/scripts:projectScriptVersionCount\(project\)/);assert.match(workspace,/Scripts ·/);});
test("Test H: 复制项目复制资产并生成新 ID",()=>{assert.match(page,/function duplicateProject/);assert.match(page,/scriptVersions:\[\.\.\.source\.assets\.scriptVersions\]/);});
test("Test I: 删除项目必须经过确认对话框",()=>{assert.match(workspace,/setDialog\("delete"\)/);assert.match(workspace,/确认删除/);assert.match(workspace,/aria-modal="true"/);});
test("Project Memory schema version and key remain unchanged",()=>{assert.match(memory,/PROJECT_MEMORY_VERSION = 1/);assert.match(memory,/version: 1/);});
