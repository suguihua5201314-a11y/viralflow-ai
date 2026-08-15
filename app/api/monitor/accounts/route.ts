import { asc, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { monitorAccounts } from "../../../../db/schema";

const defaults = [
  ["@magicjohn.official", "全球", "钢化膜", "https://www.tiktok.com/@magicjohn.official"],
  ["@magicjohn_official.us3", "美国", "钢化膜", "https://www.tiktok.com/@magicjohn_official.us3"],
  ["@magicjohn_official.spain", "西班牙", "钢化膜", "https://www.tiktok.com/@magicjohn_official.spain"],
  ["@magic.john.it", "意大利", "钢化膜", "https://www.tiktok.com/@magic.john.it"],
  ["@magicjohn.mex", "墨西哥", "钢化膜", "https://www.tiktok.com/@magicjohn.mex"],
  ["@magicjohn_official.uk", "英国", "钢化膜", "https://www.tiktok.com/@magicjohn_official.uk"],
  ["@magicjohn_official.us6", "美国", "钢化膜", "https://www.tiktok.com/@magicjohn_official.us6"],
  ["@magicjohn_official.uk5", "英国", "钢化膜", "https://www.tiktok.com/@magicjohn_official.uk5"],
] as const;

async function ensureAccounts() {
  const db = await getDb();
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS monitor_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT NOT NULL UNIQUE,
    market TEXT NOT NULL,
    product TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`));
  for (const [handle, market, product, url] of defaults) {
    await db.insert(monitorAccounts).values({ handle, market, product, url }).onConflictDoNothing();
  }
}

export async function GET() {
  try {
    await ensureAccounts();
    const db = await getDb();
    return Response.json({ accounts: await db.select().from(monitorAccounts).orderBy(asc(monitorAccounts.id)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "账号加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureAccounts();
    const input = await request.json() as { url?: string; market?: string; product?: string };
    const url = input.url?.trim() ?? "";
    const match = url.match(/^https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._-]+)\/?(?:\?.*)?$/i);
    if (!match) return Response.json({ error: "请输入完整的TikTok账号主页链接，不要填写单条视频链接。" }, { status: 400 });
    const handle = `@${match[1]}`;
    const db = await getDb();
    const [saved] = await db.insert(monitorAccounts).values({ handle, url: `https://www.tiktok.com/${handle}`, market: input.market?.trim() || "全球", product: input.product?.trim() || "钢化膜" }).onConflictDoNothing().returning();
    if (!saved) return Response.json({ error: "这个账号已经在监控清单里。" }, { status: 409 });
    return Response.json({ account: saved }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "账号添加失败" }, { status: 500 });
  }
}
