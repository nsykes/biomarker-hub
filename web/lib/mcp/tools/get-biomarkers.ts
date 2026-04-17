import { z } from "zod";
import {
  getUserBiomarkerSlugs,
  getBiomarkerSlugsByReport,
  getBatchChartDataByUser,
} from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";
import { REGISTRY } from "@/lib/biomarker-registry";
import { toCompact, toFull } from "@/lib/mcp/format";
import { gateByUser, userIdFrom } from "./shared";

type McpServer = Parameters<
  Parameters<typeof import("mcp-handler").createMcpHandler>[0]
>[0];

const description = `Fetch the user's biomarker data. Supports filtering by:
- slugs: specific biomarkers by slug (use search-registry to find slugs by name)
- category: all biomarkers in a category (e.g., "Heart", "Metabolic")
- flag: only out-of-range results (e.g., ["HIGH", "LOW", "CRITICAL_HIGH", "CRITICAL_LOW"])
- report_id: all biomarkers from a specific lab report (get IDs from list-reports)

When called without filters, returns a compact overview of ALL biomarkers (latest values only, no history) to avoid large responses. When filtered, returns full history by default. Use include_history to override.

Response fields:
- value: numeric result. valueText: non-numeric result (blood type, urine color, "<10"). Both may be present.
- flag: NORMAL, HIGH, LOW, ABNORMAL, CRITICAL_HIGH, or CRITICAL_LOW
- direction: "up", "down", or "flat" (latest vs previous). Null if only one data point.
- referenceRange.goalDirection: "above" (higher is better), "below" (lower is better), or "within" (stay in range).
- reportId: UUID of the source report (history only). Cross-reference with list-reports.
- isCalculated: true if auto-computed from other biomarkers (e.g., ratios).`;

const schema = {
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
  report_id: z
    .string()
    .optional()
    .describe(
      "Filter to biomarkers from a specific lab report. Get report IDs from list-reports."
    ),
};

export function registerGetBiomarkers(server: McpServer): void {
  server.tool(
    "get-biomarkers",
    description,
    schema,
    async (
      { slugs, category, include_history, flag, report_id },
      { authInfo }
    ) => {
      const userId = userIdFrom(authInfo);
      const gated = await gateByUser(userId);
      if (gated) return gated;

      let targetSlugs: string[];
      if (slugs && slugs.length > 0) {
        targetSlugs = slugs;
      } else if (report_id) {
        targetSlugs = await getBiomarkerSlugsByReport(userId, report_id);
      } else {
        targetSlugs = await getUserBiomarkerSlugs(userId);
      }

      if (category && (!slugs || slugs.length === 0)) {
        targetSlugs = targetSlugs.filter((slug) => {
          const entry = REGISTRY.find((e) => e.slug === slug);
          return entry?.category.toLowerCase() === category.toLowerCase();
        });
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

      const allData = await getBatchChartDataByUser(
        userId,
        targetSlugs,
        report_id
      );
      const withTrends = allData.map((d) => ({
        data: d,
        trend: computeTrend(d.slug, d.history, d.referenceRange),
      }));

      let filtered = withTrends;
      if (flag && flag.length > 0) {
        const flagSet = new Set<string>(flag);
        filtered = withTrends.filter(
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

      const isUnfiltered =
        !slugs?.length &&
        !category &&
        (!flag || !flag.length) &&
        !report_id;
      const shouldIncludeHistory = include_history ?? !isUnfiltered;

      const result = shouldIncludeHistory
        ? filtered.map((b) => toFull(b.data, b.trend))
        : filtered.map((b) => toCompact(b.data, b.trend));

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
