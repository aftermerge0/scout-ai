import Firecrawl from "@mendable/firecrawl-js";

import { assertConfiguredFor, env } from "@/lib/env";

type GlobalWithFirecrawl = typeof globalThis & { __scoutFirecrawl?: Firecrawl };

export function getFirecrawl(): Firecrawl {
  const g = globalThis as GlobalWithFirecrawl;
  if (g.__scoutFirecrawl) return g.__scoutFirecrawl;

  assertConfiguredFor("firecrawl");
  const client = new Firecrawl({
    apiKey: env.FIRECRAWL_API_KEY,
    ...(env.FIRECRAWL_API_URL ? { apiUrl: env.FIRECRAWL_API_URL } : {}),
  });

  g.__scoutFirecrawl = client;
  return client;
}
