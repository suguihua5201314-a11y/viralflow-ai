import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const demoSource=fs.readFileSync(new URL("../app/demo-data.ts",import.meta.url),"utf8");
const pageSource=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const centerSource=fs.readFileSync(new URL("../app/data-center.tsx",import.meta.url),"utf8");

test("Demo 数据层独立且默认模式为 demo",()=>{
  assert.match(demoSource,/NEXT_PUBLIC_DATA_MODE === "real" \? "real" : "demo"/);
  assert.doesNotMatch(demoSource,/localStorage|sessionStorage|fetch\(/);
  for(const marker of ["demoDashboardData","demoProjects","demoActivities","demoAnalytics"]){assert.ok(demoSource.includes(marker),`missing ${marker}`);}
});

test("Dashboard 与数据中心明确标识演示数据",()=>{
  assert.ok(pageSource.includes('DATA_MODE==="demo"?demoDashboardData'));
  assert.ok(pageSource.includes('DATA_MODE==="demo"?demoProjects'));
  for(const marker of ["演示数据","创作趋势","最近项目","内容类型分布","市场分布","AI 服务状态","创作记录"]){assert.ok(centerSource.includes(marker),`missing ${marker}`);}
});

test("Demo 业务覆盖指定产品和市场",()=>{
  for(const marker of ["CrystalArmor 钢化膜","Oxyora 牙膏","牙贴","睫毛膏","西班牙","意大利","美国","德国"]){assert.ok(demoSource.includes(marker),`missing ${marker}`);}
});
