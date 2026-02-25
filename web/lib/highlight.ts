import { HighlightTarget } from "./types";
import {
  HIGHLIGHT_ROW_TOLERANCE,
  HIGHLIGHT_MIN_SCORE,
  HIGHLIGHT_COLOR,
} from "./constants";

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
    const matched = nameTokens.filter((token) => {
      const re = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
      return re.test(text);
    });
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
    textLayer.querySelectorAll('span[role="presentation"]')
  ) as HTMLElement[];
  if (spans.length === 0) return () => {};

  // Collect spans with their vertical positions. Use offsetTop instead of
  // getBoundingClientRect — pdfjs applies compound CSS transforms (scale,
  // scaleX) to text spans, which can cause getBoundingClientRect Y-drift
  // that grows toward the bottom of the page. offsetTop gives the resolved
  // CSS `top` value unaffected by transforms.
  const spanInfos: SpanInfo[] = spans
    .map((el) => ({
      el,
      text: (el.textContent || "").trim(),
      top: el.offsetTop,
    }))
    .filter((s) => s.text.length > 0);

  if (spanInfos.length === 0) return () => {};

  console.warn(
    `highlight: ${spanInfos.length} spans collected for "${target.rawName}"`,
    spanInfos.slice(0, 5).map((s) => ({ top: s.top.toFixed(1), text: s.text }))
  );

  // Sort by vertical position
  spanInfos.sort((a, b) => a.top - b.top);

  // Group into rows by Y-position
  const ROW_TOLERANCE = HIGHLIGHT_ROW_TOLERANCE;
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

  console.warn(
    `highlight: ${rows.length} rows formed`,
    rows.map((r, i) => ({
      row: i,
      top: r.spans[0]?.top.toFixed(1),
      spans: r.spans.length,
      text: r.text.slice(0, 80),
    }))
  );

  // Find the single best-scoring row
  let bestScore = 0;
  let bestRow: Row | null = null;

  for (const row of rows) {
    const score = scoreRow(row.text, target);
    // Bonus: a span whose full text exactly matches rawName
    const hasExactSpan = row.spans.some(
      (s) => s.text.toLowerCase() === target.rawName.toLowerCase()
    );
    const adjusted = score + (hasExactSpan ? 3 : 0);
    console.warn(
      `highlight: row score=${score} adjusted=${adjusted} exact=${hasExactSpan} len=${row.text.length} text="${row.text.slice(0, 60)}"`
    );
    // Prefer higher score; on tie, prefer shorter row (more specific)
    if (
      adjusted > bestScore ||
      (adjusted === bestScore &&
        bestRow &&
        row.text.length < bestRow.text.length)
    ) {
      bestScore = adjusted;
      bestRow = row;
    }
  }

  console.warn(
    `highlight: winner score=${bestScore} text="${bestRow?.text.slice(0, 80)}"`
  );

  // Require at least a partial name match
  if (!bestRow || bestScore < HIGHLIGHT_MIN_SCORE) return () => {};

  // Highlight only the best row's spans
  const highlighted: HTMLElement[] = [];
  for (const span of bestRow.spans) {
    span.el.style.backgroundColor = HIGHLIGHT_COLOR;
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
