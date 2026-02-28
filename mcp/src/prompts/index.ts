import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.prompt(
    "summarize-bloodwork",
    "Generate a comprehensive summary of the user's most recent lab results, highlighting out-of-range values, trends, and areas of concern.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Please summarize my recent bloodwork results. Start by calling get-health-summary to see all my biomarker data. Then organize the summary by category, highlight any out-of-range values (HIGH, LOW, ABNORMAL), note any concerning trends (values moving in unfavorable directions), and provide a brief plain-language explanation of what each flagged result means. End with an overall assessment and any suggested follow-ups.",
          },
        },
      ],
    })
  );

  server.prompt(
    "biomarkers-needing-attention",
    "Identify biomarkers that are out of range or trending in an unfavorable direction.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Which of my biomarkers need attention? Use get-health-summary to fetch all my data, then identify: 1) Any biomarkers currently flagged as HIGH, LOW, ABNORMAL, CRITICAL_HIGH, or CRITICAL_LOW. 2) Any biomarkers with a 'bad' trend sentiment (moving away from the optimal range). 3) Any biomarkers that were previously normal but are now out of range. For each flagged biomarker, explain what the value means, what the reference range is, and what the trend direction suggests. Prioritize by severity.",
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
            text: "Compare my lab reports over time. First, call list-reports to see all my reports and their dates. Then use get-health-summary to see all biomarker histories. For each biomarker that appears in multiple reports, show how the value has changed between the earliest and most recent reading. Highlight significant changes (>10% shift or flag status change). Present as a table if possible.",
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
    "Deep-dive analysis of a specific biomarker panel (lipid, metabolic, thyroid, cbc, iron, inflammation).",
    { panel: z.string().describe("The panel to analyze: 'lipid', 'metabolic', 'thyroid', 'cbc', 'iron', 'inflammation'") },
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
              text: `Please provide a deep-dive analysis of my ${panel} panel. Use get-biomarker-batch with slugs ['${slugList}'] to fetch all the relevant data. For each biomarker in the panel: 1) Show the latest value with its reference range and flag status. 2) Describe the trend over time. 3) Explain what this biomarker measures and why it matters. 4) Note any interactions between markers in this panel. Conclude with an overall panel assessment.`,
            },
          },
        ],
      };
    }
  );
}
