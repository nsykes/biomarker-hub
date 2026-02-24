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
export const FETCH_TIMEOUT_MS = 55_000; // Abort fetch before Vercel kills the function

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
