import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Phase 1 prep: lazy Prisma client singleton using the rust-free client +
 * pg driver adapter (required by Prisma ORM 7). Not called anywhere yet —
 * `lib/evaluations/store.ts` is the current in-memory data source.
 *
 * Usage once wired in: `const db = getDb();`
 */

type GlobalWithPrisma = typeof globalThis & { __scoutPrisma?: PrismaClient };

export function getDb(): PrismaClient {
  const g = globalThis as GlobalWithPrisma;
  if (g.__scoutPrisma) return g.__scoutPrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your environment before calling getDb() (see docs/PLAN.md Phase 1).",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    g.__scoutPrisma = client;
  }

  return client;
}
