import { HighlightTarget } from "./types";

interface SpanInfo {
  el: HTMLElement;
  text: string;
  top: number;
}

interface Row {
  spans: SpanInfo[];
  text: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score a row of concatenated text against the biomarker's identifying info.
 * Higher score = better match.
 */
function scoreRow(rowText: string, target: HighlightTarget): number {
  const text = rowText.toLowerCase();
  let score = 0;

  // Name matching: split rawName into tokens, require majority match
  const nameTokens = target.rawName
    .toLowerCase()
    .split(/[\s,()]+/)
    .filter((t) => t.length > 1);

  if (nameTokens.length > 0) {
    const matched = nameTokens.filter((token) => text.includes(token));
    const ratio = matched.length / nameTokens.length;
    if (ratio >= 0.5) {
      score += ratio * 10;
    }
  }

  // Value matching: word-boundary to prevent "20" matching "200" or "2061"
  if (target.value !== null) {
    const escaped = escapeRegex(target.value);
    const regex = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`);
    if (regex.test(rowText)) {
      score += 5;
    }
  }

  // Unit matching: bonus signal
  if (target.unit) {
    if (text.includes(target.unit.toLowerCase())) {
      score += 2;
    }
  }

  return score;
}

/**
 * Groups PDF text-layer spans into rows by Y-position, scores each row
 * against the biomarker, and highlights only the single best-matching row.
 * Returns a cleanup function that removes the highlights.
 */
export function applyHighlights(
  pageContainer: HTMLElement,
  target: HighlightTarget
): () => void {
  const textLayer = pageContainer.querySelector(
    ".react-pdf__Page__textContent"
  );
  if (!textLayer) return () => {};

  const spans = Array.from(
    textLayer.querySelectorAll("span")
  ) as HTMLElement[];
  if (spans.length === 0) return () => {};

  // Collect spans with their vertical positions
  const spanInfos: SpanInfo[] = spans
    .map((el) => ({
      el,
      text: (el.textContent || "").trim(),
      top: el.getBoundingClientRect().top,
    }))
    .filter((s) => s.text.length > 0);

  if (spanInfos.length === 0) return () => {};

  // Sort by vertical position
  spanInfos.sort((a, b) => a.top - b.top);

  // Group into rows by Y-position (3px tolerance for minor alignment diffs)
  const ROW_TOLERANCE = 3;
  const rows: Row[] = [];
  let currentSpans: SpanInfo[] = [spanInfos[0]];
  let currentTop = spanInfos[0].top;

  for (let i = 1; i < spanInfos.length; i++) {
    if (Math.abs(spanInfos[i].top - currentTop) <= ROW_TOLERANCE) {
      currentSpans.push(spanInfos[i]);
    } else {
      rows.push({
        spans: currentSpans,
        text: currentSpans.map((s) => s.text).join(" "),
      });
      currentSpans = [spanInfos[i]];
      currentTop = spanInfos[i].top;
    }
  }
  rows.push({
    spans: currentSpans,
    text: currentSpans.map((s) => s.text).join(" "),
  });

  // Find the single best-scoring row
  let bestScore = 0;
  let bestRow: Row | null = null;

  for (const row of rows) {
    const score = scoreRow(row.text, target);
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  // Require at least a partial name match (score >= 5)
  if (!bestRow || bestScore < 5) return () => {};

  // Highlight only the best row's spans
  const highlighted: HTMLElement[] = [];
  for (const span of bestRow.spans) {
    span.el.style.backgroundColor = "rgba(250, 204, 21, 0.4)";
    span.el.style.borderRadius = "2px";
    highlighted.push(span.el);
  }

  // Scroll the first span of the matched row into view
  if (highlighted.length > 0) {
    highlighted[0].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return () => {
    highlighted.forEach((el) => {
      el.style.backgroundColor = "";
      el.style.borderRadius = "";
    });
  };
}

/**
 * Build a highlight target from a biomarker for row-based matching.
 */
export function buildHighlightTarget(biomarker: {
  rawName: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  page: number;
}): HighlightTarget {
  return {
    page: biomarker.page,
    rawName: biomarker.rawName,
    value:
      biomarker.value !== null
        ? String(biomarker.value)
        : biomarker.valueText || null,
    unit: biomarker.unit,
  };
}
