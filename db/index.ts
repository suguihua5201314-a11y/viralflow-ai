import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { getCloudflareD1Binding } from "./cloudflare-runtime";

export async function getDb() {
  return drizzle(await getCloudflareD1Binding(), { schema });
}
