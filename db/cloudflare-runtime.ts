export type D1Statement = {
  bind(...values:unknown[]):D1Statement;
  run():Promise<unknown>;
  first<T>():Promise<T|null>;
};

export type D1DatabaseBinding = {
  prepare(query:string):D1Statement;
};

type CloudflareEnvironment = { DB?:D1DatabaseBinding };

export class CloudflareStorageUnavailableError extends Error {
  constructor(){super("当前运行环境未连接团队云端数据库");this.name="CloudflareStorageUnavailableError";}
}

export async function getCloudflareD1Binding():Promise<D1DatabaseBinding> {
  if(typeof process!=="undefined"&&process.env.VERCEL)throw new CloudflareStorageUnavailableError();
  try {
    // Keep the Cloudflare-only module outside Vercel's static module graph.
    const moduleName=["cloudflare","workers"].join(":");
    const runtime=await import(moduleName) as {env?:CloudflareEnvironment};
    if(!runtime.env?.DB)throw new CloudflareStorageUnavailableError();
    return runtime.env.DB;
  } catch(error) {
    if(error instanceof CloudflareStorageUnavailableError)throw error;
    throw new CloudflareStorageUnavailableError();
  }
}
