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
 *
 * For DEXA biomarkers (target.region is set), uses region-aware scoring
 * because DEXA tables put metric names in column headers and region names
 * in data rows — the full rawName won't appear on any single row.
 */
function scoreRow(rowText: string, target: HighlightTarget): number {
  const text = rowText.toLowerCase();
  let score = 0;

  if (target.region) {
    // DEXA region-aware scoring: match region name in row instead of full rawName
    const regionLower = target.region.toLowerCase();
    const regionRe = new RegExp(`\\b${escapeRegex(regionLower)}\\b`, "i");
    if (regionRe.test(text)) {
      score += 8;
    }
  } else {
    // Standard scoring: split rawName into tokens, require majority match
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

  const topValues = spanInfos.slice(0, 5).map((s) => `${s.top.toFixed(1)}:"${s.text.slice(0, 20)}"`).join(', ');
  console.warn(
    `highlight: ${spanInfos.length} spans collected for "${target.rawName}" — first 5: [${topValues}]`
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

  const rowSummary = rows.map((r, i) => `row${i}@${r.spans[0]?.top.toFixed(1)}(${r.spans.length}sp):"${r.text.slice(0, 40)}"`).join(' | ');
  console.warn(`highlight: ${rows.length} rows formed — ${rowSummary}`);

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

  // Require at least a partial name match
  if (!bestRow || bestScore < HIGHLIGHT_MIN_SCORE) {
    console.warn(`highlight: no match (bestScore=${bestScore})`);
    return () => {};
  }

  // Log winning row diagnostics
  const winSpan = bestRow.spans[0];
  const textLayerEl = textLayer as HTMLElement;
  const tlRect = textLayerEl.getBoundingClientRect();
  const winRect = winSpan.el.getBoundingClientRect();
  const scaleFactor = getComputedStyle(textLayerEl).getPropertyValue('--total-scale-factor');
  console.warn(
    `highlight: winner score=${bestScore} text="${bestRow.text.slice(0, 80)}" ` +
    `offsetTop=${winSpan.top.toFixed(1)} bcrTop=${(winRect.top - tlRect.top).toFixed(1)} ` +
    `scaleFactor=${scaleFactor}`
  );

  // Create overlay div positioned at the winning row's visual bounds.
  // Using an overlay (sibling of text layer) instead of inline span styles
  // so the highlight persists through text layer re-renders.
  const pageEl = pageContainer.querySelector('.react-pdf__Page') as HTMLElement;
  if (!pageEl) return () => {};

  // Remove any existing overlay
  pageEl.querySelector('[data-highlight-overlay]')?.remove();

  const pageRect = pageEl.getBoundingClientRect();
  const rects = bestRow.spans.map(s => s.el.getBoundingClientRect());
  const top = Math.min(...rects.map(r => r.top)) - pageRect.top;
  const bottom = Math.max(...rects.map(r => r.bottom)) - pageRect.top;
  const left = Math.min(...rects.map(r => r.left)) - pageRect.left;
  const right = Math.max(...rects.map(r => r.right)) - pageRect.left;

  const overlay = document.createElement('div');
  overlay.setAttribute('data-highlight-overlay', 'true');
  overlay.style.cssText = `
    position: absolute;
    top: ${top}px; left: ${left}px;
    width: ${right - left}px; height: ${bottom - top}px;
    background-color: ${HIGHLIGHT_COLOR};
    border-radius: 2px;
    pointer-events: none;
    z-index: 4;
  `;
  pageEl.appendChild(overlay);
  overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return () => overlay.remove();
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
  region?: string | null;
}): HighlightTarget {
  return {
    page: biomarker.page,
    rawName: biomarker.rawName,
    value:
      biomarker.value !== null
        ? String(biomarker.value)
        : biomarker.valueText || null,
    unit: biomarker.unit,
    region: biomarker.region ?? null,
  };
}
