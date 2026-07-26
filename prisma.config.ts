import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// Prisma ORM v7 config: schema/migrations location + CLI datasource URL.
// This only affects `prisma generate` / `migrate` / `studio`. The app's
// runtime PrismaClient (lib/db.ts) is configured separately via the
// @prisma/adapter-pg driver adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
