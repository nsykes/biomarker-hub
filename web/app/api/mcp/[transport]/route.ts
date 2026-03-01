import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { reports, biomarkerResults } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  getUserBiomarkerSlugs,
  getBiomarkerSlugsByReport,
  getBatchChartDataByUser,
} from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";
import { REGISTRY } from "@/lib/biomarker-registry";
import { toCompact, toFull } from "@/lib/mcp/format";
import { registerPrompts } from "@/lib/mcp/prompts";
import { validateOAuthToken } from "@/lib/mcp/auth";
import { validateApiKey } from "@/lib/db/actions/api-keys";

const handler = createMcpHandler(
  (server) => {
    // --- Tool: get-biomarkers ---
    server.tool(
      "get-biomarkers",
      `Fetch the user's biomarker data. Supports filtering by:
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
- isCalculated: true if auto-computed from other biomarkers (e.g., ratios).`,
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
        report_id: z
          .string()
          .optional()
          .describe(
            "Filter to biomarkers from a specific lab report. Get report IDs from list-reports."
          ),
      },
      async (
        { slugs, category, include_history, flag, report_id },
        { authInfo }
      ) => {
        const userId = authInfo!.extra!.userId as string;

        // Resolve target slugs
        let targetSlugs: string[];
        if (slugs && slugs.length > 0) {
          targetSlugs = slugs;
        } else if (report_id) {
          targetSlugs = await getBiomarkerSlugsByReport(userId, report_id);
        } else {
          targetSlugs = await getUserBiomarkerSlugs(userId);
        }

        // Filter by category (when slugs not explicitly provided)
        if (category && (!slugs || slugs.length === 0)) {
          targetSlugs = targetSlugs.filter((slug) => {
            const entry = REGISTRY.find((e) => e.slug === slug);
            return (
              entry?.category.toLowerCase() === category.toLowerCase()
            );
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

        // Batch fetch data (direct DB)
        const allData = await getBatchChartDataByUser(
          userId,
          targetSlugs,
          report_id
        );

        // Compute trends
        const withTrends = allData.map((d) => ({
          data: d,
          trend: computeTrend(d.slug, d.history, d.referenceRange),
        }));

        // Filter by flag
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

        // Smart history defaulting
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

    // --- Tool: list-reports ---
    server.tool(
      "list-reports",
      "List all uploaded lab reports with collection dates, sources, lab names, and biomarker counts. Does NOT include PDF data.",
      {},
      async (_, { authInfo }) => {
        const userId = authInfo!.extra!.userId as string;

        const rows = await db
          .select({
            id: reports.id,
            filename: reports.filename,
            source: reports.source,
            labName: reports.labName,
            collectionDate: reports.collectionDate,
            reportType: reports.reportType,
            addedAt: reports.addedAt,
            biomarkerCount:
              sql<number>`count(${biomarkerResults.id})::int`,
          })
          .from(reports)
          .leftJoin(
            biomarkerResults,
            eq(biomarkerResults.reportId, reports.id)
          )
          .where(eq(reports.userId, userId))
          .groupBy(reports.id)
          .orderBy(desc(reports.collectionDate));

        const result = rows.map((r) => ({
          id: r.id,
          filename: r.filename,
          source: r.source,
          labName: r.labName,
          collectionDate: r.collectionDate,
          reportType: r.reportType,
          addedAt: r.addedAt.toISOString(),
          biomarkerCount: r.biomarkerCount,
        }));

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

    // --- Tool: search-registry ---
    server.tool(
      "search-registry",
      "Search the reference database of 198 recognized biomarkers by name, abbreviation, or category. Returns clinical definitions and slugs. This is reference data, not user data. Use this to find the correct slug when the user refers to a biomarker by name, then call get-biomarkers with those slugs.",
      {
        query: z
          .string()
          .describe("Biomarker name, abbreviation, or category to search"),
      },
      async ({ query }) => {
        const q = query.toLowerCase();
        const filtered = REGISTRY.filter(
          (e) =>
            e.slug.includes(q) ||
            e.displayName.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            e.aliases.some((a) => a.toLowerCase().includes(q)) ||
            (e.summary?.toLowerCase().includes(q) ?? false)
        );

        if (filtered.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No biomarkers found matching "${query}". Try a different name or abbreviation.`,
              },
            ],
          };
        }

        const entries = filtered.map((e) => ({
          slug: e.slug,
          displayName: e.displayName,
          fullName: e.fullName,
          category: e.category,
          defaultUnit: e.defaultUnit,
          summary: e.summary ?? null,
          specimenType: e.specimenType,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(entries, null, 2),
            },
          ],
        };
      }
    );

    // --- Prompts ---
    registerPrompts(server);
  },
  {
    serverInfo: {
      name: "biomarker-hub",
      version: "0.1.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  }
);

// Wrap with auth: OAuth tokens + API key fallback
const authHandler = withMcpAuth(
  handler,
  async (
    _req: Request,
    bearerToken?: string
  ): Promise<AuthInfo | undefined> => {
    if (!bearerToken) return undefined;

    // Try OAuth token first
    let userId = await validateOAuthToken(bearerToken);

    // Fallback: existing API key auth (bh_ prefix)
    if (!userId && bearerToken.startsWith("bh_")) {
      userId = await validateApiKey(bearerToken);
    }

    if (!userId) return undefined;

    return {
      token: bearerToken,
      clientId: "biomarker-hub",
      scopes: [],
      extra: { userId },
    };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
  }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
