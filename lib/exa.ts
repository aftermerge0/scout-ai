import Exa from "exa-js";

import { assertConfiguredFor, env } from "@/lib/env";

type GlobalWithExa = typeof globalThis & { __scoutExa?: Exa };

export function getExa(): Exa {
  const g = globalThis as GlobalWithExa;
  if (g.__scoutExa) return g.__scoutExa;

  assertConfiguredFor("exa");
  const client = new Exa(env.EXA_API_KEY);

  g.__scoutExa = client;
  return client;
}
