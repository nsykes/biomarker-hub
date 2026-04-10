import { z } from "zod";

const biomarkerSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  metricName: z.string(),
  rawName: z.string(),
  value: z.number().nullable(),
  valueText: z.string().nullable().optional(),
  valueModifier: z.enum(["<", ">"]).nullable().optional(),
  unit: z.string().nullable(),
  referenceRangeLow: z.number().nullable(),
  referenceRangeHigh: z.number().nullable(),
  flag: z.enum([
    "NORMAL",
    "LOW",
    "HIGH",
    "ABNORMAL",
    "CRITICAL_LOW",
    "CRITICAL_HIGH",
  ]),
  page: z.number().int().nullable().optional(),
  region: z.string().nullable().optional(),
  canonicalSlug: z.string().nullable().optional(),
  isCalculated: z.boolean().optional(),
});

const reportInfoSchema = z.object({
  source: z.string().default(""),
  labName: z.string().nullable().default(null),
  collectionDate: z.string().default(""),
  reportType: z.enum(["blood_panel", "dexa_scan", "other"]).default("other"),
  patientName: z.string().optional(),
});

export const extractionResultSchema = z.object({
  reportInfo: reportInfoSchema,
  biomarkers: z.array(biomarkerSchema),
});

export type ValidatedExtractionResult = z.infer<typeof extractionResultSchema>;
