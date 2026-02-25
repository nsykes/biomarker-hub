# PDF Highlight Fix Attempts

Tracking all attempts to fix the bug where clicking a bottom-half biomarker highlights the wrong row (usually near the top of the page).

## Attempt 1: Initial row-based algorithm

- **What**: Replaced substring search with row-based spatial matching. Groups spans by Y-position, scores rows by name/value/unit match.
- **Result**: Worked for top-half biomarkers but bottom-half still landed on wrong row.

## Attempt 2: getBoundingClientRect instead of offsetTop

- **What**: Switched from `offsetTop` to `getBoundingClientRect().top - textLayerRect.top` for transform-aware Y-offsets.
- **Result**: Improved positioning accuracy but bottom-half still sometimes wrong.

## Attempt 3: Exclude markedContent spans

- **What**: Changed selector from `span` to `span:not(.markedContent)` to skip pdfjs v5 wrapper spans that sit at Y=0.
- **Result**: Helped but didn't fully fix — children of `.markedContent` wrappers could still cluster at Y=0.

## Attempt 4: Filter zero-height spans

- **What**: Added filtering to exclude spans with zero height/width to skip invisible wrapper elements.
- **Result**: Still failed — some legitimate spans could be affected, and the core scoring issue remained.

## Attempt 5: Word-boundary matching + exact-span bonus + role selector (current)

Three targeted fixes addressing two independent bugs:

### Bug 1: Substring name matching (scoring)
`text.includes(token)` for name matching let "AST" match "FASTING" and "PHOSPHATASE" — rows near the top of the page. With value+unit, the correct AST row scores 17, but a false-positive row can tie or beat it.

**Fix**: Word-boundary regex (`\btoken\b`) for name token matching. "AST" no longer matches "FASTING".

### Bug 2: Mega-row at Y=0 (positioning)
pdfjs v5 `.markedContent` wrapper spans sit at `top: 0; height: 0`. Even excluding wrappers, their children can cluster at Y=0. This creates a "mega-row" at Y=0 containing all page text.

**Fixes**:
1. `span[role="presentation"]` selector — every real text span gets this role; wrappers don't.
2. Exact-span bonus (+3) when a span's full text exactly matches rawName — strong signal for the real row.
3. Shorter-row tiebreaker — a data row like "AST 21 10-40 U/L" is shorter than a mega-row with all page text.

### Diagnostic logging
Added `console.debug` calls at span collection, row formation, and scoring to make future debugging immediate.

**Files changed**: `web/lib/highlight.ts`

**Result**: Scoring fixes correct but didn't help — the underlying Y-position data from `getBoundingClientRect()` was wrong for bottom-half spans. `console.debug` logs were invisible in Chrome (hidden by default).

## Attempt 6: offsetTop + double rAF + visible logging

Root cause identified: pdfjs applies compound CSS transforms (`scale(1/minFontSize)` and `scaleX(...)`) to text spans. `getBoundingClientRect()` includes transform effects, causing Y-drift that grows toward the bottom of the page. `offsetTop` returns the CSS-resolved `top` value unaffected by transforms.

### Changes

1. **`web/lib/highlight.ts`**: Switched from `getBoundingClientRect().top - textLayerRect.top` to `el.offsetTop` for Y-position measurement. Removed unused `textLayerRect`. This gives transform-independent positions.
2. **`web/components/PdfViewer.tsx`**: Double `requestAnimationFrame` — first frame lets the browser resolve CSS custom properties (`calc(var(--total-scale-factor) * Npx)`), second frame ensures `offsetTop` values are fully settled.
3. **`web/lib/highlight.ts`**: Changed `console.debug` → `console.warn` so diagnostic logs are visible by default in Chrome.

**Files changed**: `web/lib/highlight.ts`, `web/components/PdfViewer.tsx`
