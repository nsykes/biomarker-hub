// Shared magic values — single source of truth across the codebase.

// OpenRouter
export const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-pro";

// Extraction
export const EXTRACTION_MAX_TOKENS = 16000;
export const EXTRACTION_TEMPERATURE = 0;

// PDF highlight (row-based matching)
export const HIGHLIGHT_ROW_TOLERANCE = 3;
export const HIGHLIGHT_MIN_SCORE = 5;
export const HIGHLIGHT_COLOR = "rgba(250, 204, 21, 0.4)";

// Biomarker flags
export const FLAG_COLORS: Record<string, string> = {
  NORMAL: "#16a34a",
  LOW: "#2563eb",
  HIGH: "#dc2626",
  ABNORMAL: "#ca8a04",
  CRITICAL_LOW: "#1e40af",
  CRITICAL_HIGH: "#991b1b",
};

export const FLAG_OPTIONS = [
  "NORMAL",
  "LOW",
  "HIGH",
  "ABNORMAL",
  "CRITICAL_LOW",
  "CRITICAL_HIGH",
] as const;
