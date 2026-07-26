import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
  id: uuid().primaryKey().defaultRandom(),
  subject: text().notNull(),
  status: text().notNull().default("pending"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
