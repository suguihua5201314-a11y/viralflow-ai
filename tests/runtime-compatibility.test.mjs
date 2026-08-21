import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("Vercel routes use Node runtime and do not statically import Cloudflare modules",async()=>{
  const files=await Promise.all([
    readFile(new URL("../app/api/scripts/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/api/team-data/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/index.ts",import.meta.url),"utf8"),
  ]);
  assert.match(files[0],/export const runtime\s*=\s*["']nodejs["']/);
  assert.match(files[1],/export const runtime\s*=\s*["']nodejs["']/);
  for(const source of files)assert.doesNotMatch(source,/import\s*\(\s*["']cloudflare:workers["']\s*\)/);
});

test("Vercel Cloudflare binding degrades with an explicit unavailable error",async()=>{
  const previous=process.env.VERCEL;
  process.env.VERCEL="1";
  try{
    const {getCloudflareD1Binding}=await import(`../db/cloudflare-runtime.ts?runtime=${Date.now()}`);
    await assert.rejects(getCloudflareD1Binding(),error=>error?.name==="CloudflareStorageUnavailableError");
  } finally {
    if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;
  }
});
