CREATE TABLE "biomarker_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"canonical_slug" text,
	"category" text NOT NULL,
	"metric_name" text NOT NULL,
	"raw_name" text NOT NULL,
	"value" numeric,
	"value_text" text,
	"value_modifier" text,
	"unit" text,
	"reference_range_low" numeric,
	"reference_range_high" numeric,
	"flag" text NOT NULL,
	"page" integer,
	"region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date_of_birth" date,
	"sex" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"filename" text NOT NULL,
	"source" text,
	"lab_name" text,
	"collection_date" date,
	"report_type" text,
	"patient_name_extracted" text,
	"pdf_data" "bytea",
	"pdf_size_bytes" integer,
	"extraction_model" text,
	"extraction_tokens" integer,
	"extraction_duration_ms" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"openrouter_api_key" text,
	"default_model" text DEFAULT 'google/gemini-2.5-pro' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomarker_results" ADD CONSTRAINT "biomarker_results_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_biomarker_results_report_id" ON "biomarker_results" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_biomarker_results_slug_report" ON "biomarker_results" USING btree ("canonical_slug","report_id");--> statement-breakpoint
CREATE INDEX "idx_reports_patient_date" ON "reports" USING btree ("patient_id","collection_date");--> statement-breakpoint
CREATE INDEX "idx_reports_collection_date" ON "reports" USING btree ("collection_date");