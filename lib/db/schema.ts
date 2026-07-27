import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid().primaryKey().defaultRandom(),
    input: text().notNull(),
    normalizedUrl: text(),
    companyName: text(),
    domain: text(),
    status: text().notNull(),
    phase: text().notNull(),
    contextJson: jsonb(),
    summaryJson: jsonb(),
    errorJson: jsonb(),
    progressJson: jsonb(),
    overallScore: doublePrecision(),
    verdict: text(),
    confidence: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("evaluations_domain_idx").on(table.domain),
    index("evaluations_status_idx").on(table.status),
  ]
)

export const evidence = pgTable(
  "evidence",
  {
    id: uuid().primaryKey().defaultRandom(),
    evaluationId: uuid()
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    sourceType: text().notNull(),
    url: text().notNull(),
    title: text(),
    domain: text(),
    snippet: text(),
    markdown: text(),
    fetchedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [index("evidence_evaluation_id_idx").on(table.evaluationId)]
)

export const reportSections = pgTable(
  "report_sections",
  {
    id: uuid().primaryKey().defaultRandom(),
    evaluationId: uuid()
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    key: text().notNull(),
    title: text().notNull(),
    status: text().notNull(),
    confidence: integer(),
    dataJson: jsonb(),
    errorJson: jsonb(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("report_sections_evaluation_id_key_unique").on(
      table.evaluationId,
      table.key
    ),
  ]
)

export const findings = pgTable(
  "findings",
  {
    id: uuid().primaryKey().defaultRandom(),
    evaluationId: uuid()
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    category: text().notNull(),
    severity: text().notNull(),
    title: text().notNull(),
    summary: text().notNull(),
    confidence: integer().notNull(),
    evidenceIds: text().array().notNull(),
    sectionKey: text().notNull(),
  },
  (table) => [index("findings_evaluation_id_idx").on(table.evaluationId)]
)

export type Evaluation = typeof evaluations.$inferSelect
export type NewEvaluation = typeof evaluations.$inferInsert
export type Evidence = typeof evidence.$inferSelect
export type NewEvidence = typeof evidence.$inferInsert
export type ReportSection = typeof reportSections.$inferSelect
export type NewReportSection = typeof reportSections.$inferInsert
export type FindingRow = typeof findings.$inferSelect
export type NewFinding = typeof findings.$inferInsert
