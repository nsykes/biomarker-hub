import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  integer,
  boolean,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { DEFAULT_MODEL } from "@/lib/constants";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// 1. Profiles — extends neon_auth.user with app-specific health fields (1:1)
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(), // FK to neon_auth.user.id (managed externally)
  dateOfBirth: date("date_of_birth"),
  sex: text("sex", { enum: ["male", "female"] }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Reports (replaces "files")
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // FK to neon_auth.user.id (managed externally)
    filename: text("filename").notNull(),
    source: text("source"),
    labName: text("lab_name"),
    collectionDate: date("collection_date"),
    reportType: text("report_type", {
      enum: ["blood_panel", "dexa_scan", "other"],
    }),
    patientNameExtracted: text("patient_name_extracted"),
    pdfData: bytea("pdf_data"),
    pdfSizeBytes: integer("pdf_size_bytes"),
    extractionModel: text("extraction_model"),
    extractionTokens: integer("extraction_tokens"),
    extractionDurationMs: integer("extraction_duration_ms"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_reports_user_date").on(table.userId, table.collectionDate),
    index("idx_reports_collection_date").on(table.collectionDate),
  ]
);

// 3. Biomarker results
export const biomarkerResults = pgTable(
  "biomarker_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    canonicalSlug: text("canonical_slug"),
    category: text("category").notNull(),
    metricName: text("metric_name").notNull(),
    rawName: text("raw_name").notNull(),
    value: numeric("value"),
    valueText: text("value_text"),
    valueModifier: text("value_modifier", { enum: ["<", ">"] }),
    unit: text("unit"),
    referenceRangeLow: numeric("reference_range_low"),
    referenceRangeHigh: numeric("reference_range_high"),
    flag: text("flag", {
      enum: ["NORMAL", "LOW", "HIGH", "ABNORMAL", "CRITICAL_LOW", "CRITICAL_HIGH"],
    }).notNull(),
    page: integer("page"),
    isCalculated: boolean("is_calculated").notNull().default(false),
    region: text("region"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_biomarker_results_report_id").on(table.reportId),
    index("idx_biomarker_results_slug_report").on(
      table.canonicalSlug,
      table.reportId
    ),
  ]
);

// 4. Reference ranges — global per-biomarker reference ranges (empty for now, populated later)
export const referenceRanges = pgTable("reference_ranges", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalSlug: text("canonical_slug").notNull().unique(),
  rangeLow: numeric("range_low"),
  rangeHigh: numeric("range_high"),
  goalDirection: text("goal_direction", {
    enum: ["below", "above", "within"],
  })
    .notNull()
    .default("within"),
  unit: text("unit"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 5. Settings — per-user (each user gets their own row)
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  openRouterApiKey: text("openrouter_api_key"),
  defaultModel: text("default_model")
    .notNull()
    .default(DEFAULT_MODEL),
});

// 6. Dashboards — user-scoped named collections of biomarker charts
export const dashboards = pgTable(
  "dashboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_dashboards_user").on(table.userId)]
);

// 7. Dashboard items — biomarker membership + ordering within a dashboard
export const dashboardItems = pgTable(
  "dashboard_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    canonicalSlug: text("canonical_slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    groupId: text("group_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_dashboard_items_dashboard").on(table.dashboardId)]
);

// 8. API keys — per-user keys for external API access (MCP server, etc.)
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_api_keys_user").on(table.userId),
    index("idx_api_keys_hash").on(table.keyHash),
  ]
);
