import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { assertConfiguredFor, env } from "@/lib/env"

import * as dbSchema from "./schema"

function createDb() {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  return drizzle({ client: pool })
}

export type Db = ReturnType<typeof createDb>

type GlobalWithDrizzle = typeof globalThis & { __scoutDrizzle?: Db }

let db: Db | undefined

export function getDb(): Db {
  const g = globalThis as GlobalWithDrizzle
  if (env.NODE_ENV !== "production" && g.__scoutDrizzle) return g.__scoutDrizzle
  if (db) return db

  assertConfiguredFor("database")
  db = createDb()

  if (env.NODE_ENV !== "production") {
    g.__scoutDrizzle = db
  }

  return db
}

export { dbSchema }
export * as schema from "./schema"
export * from "./schema"
