import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.prompt(
    "summarize-bloodwork",
    "Generate a summary of the user's most recent lab results, organized by category with out-of-range values highlighted.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Summarize my recent bloodwork. Call get-biomarkers to see all biomarker data with values, flags, directions, and history. Organize by category. Present each flagged result (HIGH, LOW, ABNORMAL, CRITICAL_HIGH, CRITICAL_LOW) with its value, reference range, and direction of change.",
          },
        },
      ],
    })
  );

  server.prompt(
    "biomarkers-needing-attention",
    "Identify biomarkers that are currently out of range.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Which of my biomarkers are out of range? Use get-biomarkers to fetch all data. Identify any flagged as HIGH, LOW, ABNORMAL, CRITICAL_HIGH, or CRITICAL_LOW. Note the direction of change for each. Show the value, reference range, and flag for each one.",
          },
        },
      ],
    })
  );

  server.prompt(
    "compare-reports",
    "Compare biomarker values between different lab reports to identify changes over time.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Compare my lab reports over time. Call list-reports to see all reports and dates. Then call get-biomarkers to see all biomarker histories. For each biomarker in multiple reports, show how the value changed. Highlight significant changes (>10% shift or flag change). Present as a table.",
          },
        },
      ],
    })
  );

  const panelSlugs: Record<string, string[]> = {
    lipid: [
      "total-cholesterol",
      "hdl-cholesterol",
      "ldl-cholesterol",
      "triglycerides",
      "non-hdl-cholesterol",
      "apolipoprotein-b",
      "lipoprotein-a",
      "tg-hdl-ratio",
      "tc-hdl-ratio",
    ],
    metabolic: [
      "glucose",
      "hemoglobin-a1c",
      "insulin",
      "homa-ir",
      "uric-acid",
    ],
    thyroid: [
      "tsh",
      "free-t4",
      "free-t3",
      "tpo-antibody",
      "thyroglobulin-antibody",
    ],
    cbc: [
      "wbc",
      "rbc",
      "hemoglobin",
      "hematocrit",
      "platelets",
      "mcv",
      "mch",
      "mchc",
    ],
    iron: ["iron-total", "ferritin", "tibc", "iron-saturation"],
    inflammation: ["hs-crp", "nlr"],
  };

  server.prompt(
    "analyze-panel",
    "Detailed analysis of a specific biomarker panel (lipid, metabolic, thyroid, cbc, iron, inflammation).",
    {
      panel: z
        .string()
        .describe(
          "The panel to analyze: 'lipid', 'metabolic', 'thyroid', 'cbc', 'iron', 'inflammation'"
        ),
    },
    ({ panel }) => {
      const slugs = panelSlugs[panel.toLowerCase()] ?? [];
      const slugList =
        slugs.length > 0 ? slugs.join("', '") : panel;

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Analyze my ${panel} panel. Use get-biomarkers with slugs ['${slugList}']. For each biomarker: show the latest value, reference range, flag, and direction. Note relationships between markers in this panel.`,
            },
          },
        ],
      };
    }
  );
}
