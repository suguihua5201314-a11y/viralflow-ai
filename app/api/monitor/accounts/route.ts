const defaults = [
  ["@magicjohn.official", "全球", "钢化膜"], ["@magicjohn_official.us3", "美国", "钢化膜"],
  ["@magicjohn_official.spain", "西班牙", "钢化膜"], ["@magic.john.it", "意大利", "钢化膜"],
  ["@magicjohn.mex", "墨西哥", "钢化膜"], ["@magicjohn_official.uk", "英国", "钢化膜"],
  ["@magicjohn_official.us6", "美国", "钢化膜"], ["@magicjohn_official.uk5", "英国", "钢化膜"],
].map(([handle, market, product], id) => ({ id:id + 1, handle, market, product, url:`https://www.tiktok.com/${handle}` }));

export async function GET() { return Response.json({ accounts:defaults }); }

export async function POST(request:Request) {
  const input = await request.json() as { url?:string; market?:string; product?:string };
  const url = input.url?.trim() ?? "";
  const match = url.match(/^https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._-]+)\/?(?:\?.*)?$/i);
  if (!match) return Response.json({ error:"请输入完整的TikTok账号主页链接，不要填写单条视频链接。" }, { status:400 });
  const handle = `@${match[1]}`;
  return Response.json({ account:{ id:Date.now(), handle, market:input.market?.trim() || "全球", product:input.product?.trim() || "钢化膜", url:`https://www.tiktok.com/${handle}` } }, { status:201 });
}
