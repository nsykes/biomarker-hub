import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BiomarkerHubClient, BiomarkerDetail } from "../client.js";

interface CompactBiomarker {
  slug: string;
  name: string;
  category: string;
  value: number | null;
  unit: string | null;
  date: string | null;
  flag: string | null;
  direction: "up" | "down" | "flat" | null;
  referenceRange: {
    low: number | null;
    high: number | null;
    goalDirection: string;
    unit: string | null;
  } | null;
}

interface FullBiomarker extends CompactBiomarker {
  fullName: string;
  summary: string | null;
  history: {
    date: string | null;
    value: number | null;
    valueText?: string | null;
    unit: string | null;
    flag: string;
    reportId: string;
    lab: string | null;
    isCalculated: boolean;
  }[];
}

function toCompact(b: BiomarkerDetail): CompactBiomarker {
  return {
    slug: b.slug,
    name: b.displayName,
    category: b.category,
    value: b.trend?.latestValue ?? null,
    unit: b.trend?.latestUnit ?? b.defaultUnit,
    date: b.trend?.latestDate ?? null,
    flag: b.trend?.latestFlag ?? null,
    direction: b.trend?.direction ?? null,
    referenceRange: b.referenceRange
      ? {
          low: b.referenceRange.rangeLow,
          high: b.referenceRange.rangeHigh,
          goalDirection: b.referenceRange.goalDirection,
          unit: b.referenceRange.unit,
        }
      : null,
  };
}

function toFull(b: BiomarkerDetail): FullBiomarker {
  return {
    ...toCompact(b),
    fullName: b.fullName,
    summary: b.summary,
    history: b.history.map((h) => ({
      date: h.collectionDate,
      value: h.value,
      ...(h.valueText != null ? { valueText: h.valueText } : {}),
      unit: h.unit,
      flag: h.flag,
      reportId: h.reportId,
      lab: h.labName,
      isCalculated: h.isCalculated,
    })),
  };
}

const BATCH_SIZE = 50;

export function registerBiomarkerTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "get-biomarkers",
    `Fetch the user's biomarker data. Supports filtering by:
- slugs: specific biomarkers by slug (use search-registry to find slugs by name)
- category: all biomarkers in a category (e.g., "Heart", "Metabolic")
- flag: only out-of-range results (e.g., ["HIGH", "LOW", "CRITICAL_HIGH", "CRITICAL_LOW"])

When called without filters, returns a compact overview of ALL biomarkers (latest values only, no history) to avoid large responses. When filtered by slugs, category, or flag, returns full history by default. Use include_history to override either way.

Response fields:
- flag: NORMAL, HIGH, LOW, ABNORMAL, CRITICAL_HIGH, or CRITICAL_LOW
- direction: "up", "down", or "flat" (latest vs previous value). Null if only one data point.
- referenceRange.goalDirection: "above" (higher is better), "below" (lower is better), or "within" (stay in range).
- isCalculated: true if auto-computed from other biomarkers (e.g., ratios), not directly measured.
- reportId: UUID of the source report (history only). Cross-reference with list-reports.
- valueText: non-numeric results like blood type, urine color, "<10" (history only, when present).`,
    {
      slugs: z
        .array(z.string())
        .optional()
        .describe(
          "Specific biomarker slugs to fetch (e.g., ['glucose', 'hdl-cholesterol']). If omitted, returns all biomarkers. Use search-registry to find slugs by name."
        ),
      category: z
        .string()
        .optional()
        .describe(
          "Filter by category. Valid categories: Heart, Metabolic, Kidney, Electrolytes, Proteins, Liver, Iron, CBC, Inflammation, Thyroid, Endocrinology, Fatty Acids, Prostate, Vitamins, Toxins, Autoimmune, Celiac, Blood Type, Genetic, Urinalysis, Body Composition, Bone. Ignored if slugs is provided."
        ),
      include_history: z
        .boolean()
        .optional()
        .describe(
          "Include full history with dates, values, and lab sources. Default: true when filters are applied (slugs, category, or flag). Default: false for unfiltered calls (returns compact overview). Set explicitly to override."
        ),
      flag: z
        .array(
          z.enum([
            "NORMAL",
            "HIGH",
            "LOW",
            "ABNORMAL",
            "CRITICAL_HIGH",
            "CRITICAL_LOW",
          ])
        )
        .optional()
        .describe(
          "Filter by flag(s). Only return biomarkers whose latest result matches one of the given flags. Example: ['HIGH', 'LOW'] returns only out-of-range biomarkers."
        ),
    },
    async ({ slugs, category, include_history, flag }) => {
      let targetSlugs: string[];

      if (slugs && slugs.length > 0) {
        targetSlugs = slugs;
      } else {
        const { biomarkers } = await client.listBiomarkers(category);
        targetSlugs = biomarkers.map((b) => b.slug);
      }

      if (targetSlugs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No biomarker data found. The user may need to upload a lab report first.",
            },
          ],
        };
      }

      const allData: BiomarkerDetail[] = [];
      for (let i = 0; i < targetSlugs.length; i += BATCH_SIZE) {
        const chunk = targetSlugs.slice(i, i + BATCH_SIZE);
        const { biomarkers } = await client.getBiomarkerBatch(chunk);
        allData.push(...biomarkers);
      }

      let filtered = allData;
      if (flag && flag.length > 0) {
        const flagSet = new Set<string>(flag);
        filtered = allData.filter(
          (b) => b.trend != null && flagSet.has(b.trend.latestFlag)
        );
      }

      if (filtered.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: flag
                ? `No biomarkers found with flag(s): ${flag.join(", ")}. All results may be within normal range.`
                : "No biomarker data found. The user may need to upload a lab report first.",
            },
          ],
        };
      }

      const isUnfiltered = !slugs?.length && !category && (!flag || !flag.length);
      const shouldIncludeHistory = include_history ?? !isUnfiltered;

      const result = shouldIncludeHistory
        ? filtered.map(toFull)
        : filtered.map(toCompact);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
