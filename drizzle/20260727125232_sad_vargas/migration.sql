CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"input" text NOT NULL,
	"normalizedUrl" text,
	"companyName" text,
	"domain" text,
	"status" text NOT NULL,
	"phase" text NOT NULL,
	"contextJson" jsonb,
	"summaryJson" jsonb,
	"errorJson" jsonb,
	"progressJson" jsonb,
	"overallScore" double precision,
	"verdict" text,
	"confidence" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"evaluationId" uuid NOT NULL,
	"sourceType" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"domain" text,
	"snippet" text,
	"markdown" text,
	"fetchedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"evaluationId" uuid NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"confidence" integer NOT NULL,
	"evidenceIds" text[] NOT NULL,
	"sectionKey" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"evaluationId" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"confidence" integer,
	"dataJson" jsonb,
	"errorJson" jsonb,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evaluations_domain_idx" ON "evaluations" ("domain");--> statement-breakpoint
CREATE INDEX "evaluations_status_idx" ON "evaluations" ("status");--> statement-breakpoint
CREATE INDEX "evidence_evaluation_id_idx" ON "evidence" ("evaluationId");--> statement-breakpoint
CREATE INDEX "findings_evaluation_id_idx" ON "findings" ("evaluationId");--> statement-breakpoint
CREATE UNIQUE INDEX "report_sections_evaluation_id_key_unique" ON "report_sections" ("evaluationId","key");--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_evaluationId_evaluations_id_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_evaluationId_evaluations_id_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_evaluationId_evaluations_id_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE;