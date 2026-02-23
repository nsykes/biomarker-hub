import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  source: text("source"),
  labName: text("lab_name"),
  collectionDate: text("collection_date"),
  reportType: text("report_type"),
  biomarkers: jsonb("biomarkers").notNull(),
  meta: jsonb("meta").notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  openRouterApiKey: text("openrouter_api_key"),
  defaultModel: text("default_model").notNull().default("google/gemini-2.5-pro"),
});
