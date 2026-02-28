// Shared magic values — single source of truth across the codebase.

// OpenRouter
export const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-pro";

// Extraction
export const EXTRACTION_MAX_TOKENS = 32000;
export const EXTRACTION_TEMPERATURE = 0;
export const CHUNK_PAGE_THRESHOLD = 8; // Only chunk PDFs with more than this many pages
export const CHUNK_SIZE = 6; // Pages per chunk
export const FETCH_TIMEOUT_MS = 240_000; // Abort fetch before Vercel kills the function (60s margin before 300s maxDuration)

// PDF highlight (row-based matching)
export const HIGHLIGHT_ROW_TOLERANCE = 3;
export const HIGHLIGHT_MIN_SCORE = 5;
export const HIGHLIGHT_COLOR = "rgba(250, 204, 21, 0.4)";

// Biomarker flags (Apple system colors)
export const FLAG_COLORS: Record<string, string> = {
  NORMAL: "#34C759",
  LOW: "#5856D6",
  HIGH: "#FF3B30",
  ABNORMAL: "#FF9500",
  CRITICAL_LOW: "#3634A3",
  CRITICAL_HIGH: "#C5221F",
};

export const FLAG_OPTIONS = [
  "NORMAL",
  "LOW",
  "HIGH",
  "ABNORMAL",
  "CRITICAL_LOW",
  "CRITICAL_HIGH",
] as const;

// PDF validation
export const PDF_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const PDF_MAX_SIZE_LABEL = "50 MB";
export const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

// Undo toast
export const UNDO_TOAST_DURATION_MS = 5000;

// Dashboard templates
export interface DashboardTemplate {
  id: string;
  name: string;
  slugs: string[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "heart-health",
    name: "Heart Health",
    slugs: [
      "total-cholesterol",
      "hdl-cholesterol",
      "ldl-cholesterol",
      "triglycerides",
      "tg-hdl-ratio",
      "homocysteine",
    ],
  },
  {
    id: "metabolic",
    name: "Metabolic",
    slugs: [
      "glucose",
      "hemoglobin-a1c",
      "insulin",
      "homa-ir",
      "uric-acid",
    ],
  },
  {
    id: "thyroid",
    name: "Thyroid",
    slugs: [
      "tsh",
      "free-t4",
      "free-t3",
      "tpo-antibody",
      "thyroglobulin-antibody",
    ],
  },
  {
    id: "lipid-panel",
    name: "Lipid Panel",
    slugs: [
      "total-cholesterol",
      "hdl-cholesterol",
      "ldl-cholesterol",
      "triglycerides",
      "non-hdl-cholesterol",
      "apolipoprotein-b",
      "lipoprotein-a",
    ],
  },
  {
    id: "cbc",
    name: "CBC",
    slugs: [
      "wbc",
      "rbc",
      "hemoglobin",
      "hematocrit",
      "platelets",
      "mcv",
      "mch",
      "mchc",
    ],
  },
  {
    id: "iron-panel",
    name: "Iron Panel",
    slugs: ["iron-total", "ferritin", "tibc", "iron-saturation"],
  },
  {
    id: "inflammation",
    name: "Inflammation",
    slugs: ["hs-crp", "nlr"],
  },
];

// Trend sentiment colors
export const TREND_SENTIMENT_COLORS: Record<string, string> = {
  good: "#34C759",
  bad: "#FF3B30",
  neutral: "#8E8E93",
};

// Multi-metric chart colors
export const CHART_COLORS = [
  "#0A84FF",
  "#FF3B30",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#5AC8FA",
  "#FF2D55",
  "#FFCC00",
];
