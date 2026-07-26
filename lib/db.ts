import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { assertConfiguredFor, env } from "@/lib/env";

/**
 * Lazy Prisma client singleton using the rust-free client + pg driver
 * adapter (required by Prisma ORM 7). Used by `lib/evaluations/repository.ts`
 * whenever `SCOUT_API_MODE=live`.
 *
 * Usage: `const db = getDb();`
 */

type GlobalWithPrisma = typeof globalThis & { __scoutPrisma?: PrismaClient };

export function getDb(): PrismaClient {
  const g = globalThis as GlobalWithPrisma;
  if (g.__scoutPrisma) return g.__scoutPrisma;

  assertConfiguredFor("database");
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL! });
  const client = new PrismaClient({ adapter });

  if (env.NODE_ENV !== "production") {
    g.__scoutPrisma = client;
  }

  return client;
}
