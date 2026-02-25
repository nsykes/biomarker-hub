# Project Context

## What This Is

A web app for extracting structured biomarker data from lab report PDFs. Upload a PDF, an LLM extracts all biomarker results into structured JSON, then review and correct the results in a side-by-side UI with the original PDF.

Currently supports: Quest Diagnostics blood panels, Function Health reports, BodySpec DEXA scans.

## Infrastructure & Deployment

- **Hosting:** Vercel (connected to GitHub repo `nsykes/biomarker-hub`)
  - **Vercel team:** `nyle-sykes-projects` (ID: `team_iUFTfq9Qj4FVqHrvkSfC9SCX`)
  - **Vercel project:** `biomarker-hub` (ID: `prj_MXyXCGzJdhZkpEbxCq7CvfEZdza8`)
  - **Root Directory:** `web` (must be set in Vercel project settings — repo root is a monorepo, not the app)
  - **Framework Preset:** Next.js (auto-detected from root directory)
  - **Domain:** `biomarker-hub.vercel.app`
- **Database:** Neon Postgres — project **"biomarker-hub"** (ID: `jolly-sky-75880073`) under the **"Vercel: Nyle Sykes' projects"** org (ID: `org-tiny-hat-28280839`). Not the `hello@nylesykes.com` org. Connected to Vercel via integration. Neon Auth is provisioned (lives in `neon_auth` schema, separate from app tables in `public`).
- **LLM API:** OpenRouter (each user provides their own API key via Settings)
- **Repo:** Monorepo — `web/` is the Next.js 15 app
- **MCP servers configured:** Vercel (`https://mcp.vercel.com`), Neon (`https://mcp.neon.tech`), PitchBook, Granola

**Env vars:** `DATABASE_URL` (Neon connection string), `NEON_AUTH_BASE_URL` (from Neon Auth tab), `NEON_AUTH_COOKIE_SECRET` (32+ chars, `openssl rand -base64 32`). All state is fully DB-backed via Drizzle ORM (`drizzle.config.ts`, `lib/db/`).

## Architecture

```
Browser (localhost:3000 / Vercel)
├── Left pane: PDF viewer (react-pdf) with text-layer highlighting
├── Right pane: Editable results table grouped by page number
└── API route → OpenRouter (Gemini 2.5 Pro default) → structured JSON
```

## Design Decisions

### Reference Ranges: Globally Defined, Not Per-File

Reference ranges should be defined in a central lookup table, not extracted per-file. Reasons:
- Different labs report slightly different ranges for the same biomarker
- Ranges change over time as guidelines update
- We want consistent flagging across all reports

**Current behavior:** Ranges are extracted from the PDF. On first extraction, PDF ranges are auto-saved to `reference_ranges` as canonical. On subsequent extractions, if the PDF range differs from stored, a conflict modal lets the user choose which to keep. Additionally, visiting a biomarker detail page will auto-backfill the global range from historical lab data if no range exists yet (covers reports uploaded before auto-population was added).

**Goal direction inference:** `goalDirection` is automatically inferred from range bounds — both bounds → "within", only high → "below", only low → "above". This applies to all insert/update paths (extraction reconciliation, manual updates, and backfill).

### rawName vs metricName

- `rawName`: Exact text from the PDF (e.g., "UREA NITROGEN (BUN)")
- `metricName`: Normalized clinical name (e.g., "Blood Urea Nitrogen")

rawName is used for PDF highlighting (matching against text layer). metricName is for display and cross-report deduplication.

### PDF Highlighting: Row-Based Matching

The highlight algorithm groups text-layer spans into rows by Y-position, then scores each row against the biomarker's rawName + value + unit. Only the single best-matching row gets highlighted. This avoids false positives from substring matching (e.g., value "20" matching "200" or date strings).

**Highlight rendering:** An absolute-positioned overlay `<div>` is appended to `.react-pdf__Page`, positioned via `getBoundingClientRect()` relative to the page element. This is used instead of inline span styles because pdfjs text layer re-renders can replace DOM elements, losing inline style changes. The overlay persists as a sibling of the text layer.

**Debounced scheduling:** `scheduleHighlight` in PdfViewer uses `clearTimeout` + `setTimeout(100)` to debounce multiple triggers (React StrictMode double-invoke, `useEffect`, `onRenderTextLayerSuccess`). Only the last call executes, 100ms after the text layer has settled. This prevents the "jump down then back up" visual bug caused by multiple executions measuring unsettled CSS positions.

### Auth & Data Model: One User = One Patient

Every logged-in user tracks only their own health data — it's a strict 1:1 relationship. Because of this, there's no separate `patients` table. Instead:

- **`neon_auth.user`** handles identity (name, email, sessions, OAuth) — managed by Neon Auth.
- **`profiles`** extends the auth user with health-specific fields (`date_of_birth`, `sex`). Its PK is `user_id`, which is the `neon_auth.user.id`, enforcing 1:1.
- **`reports.user_id`** links directly to the auth user — no intermediary.

```
neon_auth.user (id, name, email — managed by Neon)
  └── profiles (user_id PK/FK, date_of_birth, sex)
  └── reports (user_id FK)
  │     └── biomarker_results (report_id FK)
  └── dashboards (user_id FK)
        └── dashboard_items (dashboard_id FK)
```

### LLM Extraction: Page Numbers Are Critical

Every extracted biomarker includes the 1-indexed page number where it appears. This enables click-to-source tracing in the UI. Page accuracy varies by model — Gemini 2.5 Pro is currently the most reliable.

### Unit Normalization: Display-Time, Not Ingestion-Time

Different labs report the same biomarker in different units (e.g., glucose in mg/dL vs mmol/L). The app normalizes values to the registry's canonical unit at display time using a deterministic conversion table (`web/lib/unit-conversions.ts`) based on molecular weights (~17 conversions covering all common biomarkers).

**Why display-time:** Originals are stored in DB untouched, conversion is applied when rendering charts/tables. This preserves source data fidelity and makes conversions reversible. Missing/unrecognized units pass through unchanged — no data is ever lost.

### Chunked PDF Extraction

Large PDFs (17+ pages) caused 504 gateway timeouts. PDFs exceeding `CHUNK_PAGE_THRESHOLD` (8 pages) are split into chunks of `CHUNK_SIZE` (6 pages) using `pdf-lib`, extracted in parallel via `Promise.all()`, then merged (reportInfo from first chunk, page numbers adjusted by offset, tokens aggregated). A universal post-extraction dedup pass runs on all extractions — same slug in a single report = duplicate (handles summary/appendix pages repeating earlier results).

A `FETCH_TIMEOUT_MS` (240s) `AbortController` wraps fetch calls; `maxDuration` is 300s for Vercel Pro. The extract route uses a `ReadableStream` with 15s keep-alive bytes to prevent `ERR_NETWORK_IO_SUSPENDED` on long extractions.

### DEXA Biomarker Matching: Region Prefix Stripping

BodySpec DEXA PDFs extract region-prefixed names (e.g., "Android Fat %") that don't match the registry alias "Fat %". The `matchBiomarker` fallback chain tries: (1) direct alias lookup on rawName, (2) strip region prefix from rawName (body_composition only), (3) alias lookup on metricName, (4) strip region prefix from metricName. Region stripping uses a sorted list of all region names (longest first to avoid partial matches). Gated to `body_composition` specimenType.

## Current Capabilities

### Extraction Pipeline

Upload a PDF → LLM extracts biomarkers into structured JSON → review in split-pane UI (PDF left, results right). Results grouped by page number. Users can add biomarkers (via registry-backed combobox), delete with undo toast, and remap unmatched biomarkers to registry entries. Re-extraction updates the existing report in-place (no duplicates). Model is configured in Settings. Large PDFs are automatically chunked.

### Biomarker Detail Pages

Biomarker detail views render inline within the Biomarkers tab (not as a separate page), following the same pattern as Dashboards. Clicking a biomarker row sets `activeBiomarkerSlug` state, which renders `BiomarkerDetailView` with a sticky sub-header (back button + name + category badge). The main AppShell header (logo + tabs) stays visible throughout. The `/biomarkers/[slug]` route redirects to `/?tab=biomarkers&biomarker=slug` so direct URLs and dashboard chart navigation both land in the inline view.

Each biomarker detail view includes:
- **History chart** — time-proportional X-axis, dots colored by flag status (recomputed client-side from custom reference range), reference range as shaded zone.
- **History table** — all data points with date, value, unit, flag, source. Click a row to preview the source PDF page in a modal.
- **Reference range section** — editable custom range (auto-backfilled from lab data on first visit), goal direction auto-inferred, lab-reported ranges shown for comparison. Unit-normalized values shown with originals in parentheses.

### Dashboards

Named collections of biomarker charts (e.g., "Heart Health"). Create/edit via modal with biomarker combobox selection. Detail view shows a responsive chart grid with drag-to-reorder (`@dnd-kit/sortable`). Chart data batch-fetched in 2 queries (not N). Charts link to biomarker detail pages.

### Reports & Files

Metadata-centric table (collection date + lab/source as primary identifier, not filename). PDFs stored as `bytea` in `reports.pdf_data`, fetched on demand via `/api/reports/[id]/pdf`. Inline-editable report info (date, source, lab name). CSV export of all biomarker data from Settings.

### Auth & Account

Neon Auth (`@neondatabase/auth@^0.2.0-beta.1`, Google OAuth). Per-user data isolation on all DB queries via `requireUser()`. Middleware protects pages; API routes return 401 without valid session. Server actions bypass middleware auth (they authenticate independently). Account deletion cascades to reports, biomarkers, settings, profile, and dashboards.

### UI & Design System

Apple Health-inspired design. CSS custom properties for colors, shadows, and radii. Flag colors use Apple system colors. Frosted-glass headers, pill-style tab navigation, card-wrapped sections. Geist Sans font. Expand/collapse all for category sections.

## Biomarker Registry

134+ canonical biomarkers in `web/lib/biomarker-registry.ts`. Each entry has `displayName`, `fullName` (expanded clinical name for abbreviations like AST → "Aspartate Aminotransferase"), `category`, `defaultUnit`, `aliases`, and `slug`. DEXA entries are generated programmatically for body composition (64 entries) and bone density (10 entries) regions.

**Category corrections** from audit: homocysteine → Heart, rheumatoid-factor → Autoimmune, methylmalonic-acid → Vitamins, leptin → Endocrinology, magnesium-rbc → Electrolytes.

`matchBiomarker()` maps extracted rawName/metricName to registry entries via alias lookup with region-prefix stripping fallback for DEXA (see Design Decisions).

## Extraction Prompt

The extraction prompt lives in `web/lib/prompt.ts`. Key rules it enforces:
- Extract each biomarker once (first occurrence only)
- Current results only (ignore historical/previous columns)
- Handle less-than values, qualitative results, categorical results
- Skip "SEE NOTE" entries
- Accurate page numbers for every biomarker
- Specific DEXA scan handling (regions, skip trend pages)
- Metric name normalization (rawName preserved separately)
- **Expanded normalization examples** (Rule 12): 17 explicit abbreviation-to-full-name mappings including AST, ALT, TSH, EGFR, MCV, MCH, MCHC, RDW, MPV, GGT, and PSA variants
- **Category standardization** (Rule 10): Thyroid antibodies → Thyroid; Insulin → Metabolic; Leptin/Cortisol → Endocrinology
- **Unit cleanup**: Strip "(calc)" suffix from unit strings
- **Clinical cutoff fallback** (Rule 9): If no formal reference range is printed but an optimal/clinical cutoff is noted, use that as the reference range

## Future Plans

- **MCP Server** — Expose biomarker data so Claude/ChatGPT can answer health trend questions, compare values against ranges, and summarize changes between reports.
- **Bad PDF handling** — Graceful errors for image-only PDFs (no text layer), non-lab-report PDFs (zero biomarkers), corrupted files, and password-protected PDFs.
- **Mobile responsiveness** — The split-pane extraction view needs a stacked/tabbed layout for small screens. Detail pages and settings are more straightforward.
- **Trend alerts** — Surface concerning trends across reports: values trending toward out-of-range, recent normal→abnormal crossings, significant jumps between readings.
- **Privacy audit** — Full data flow review of all third-party sub-processors (OpenRouter, Neon, Vercel) before sharing with friends/family. Goal: plain-language privacy summary for non-technical users.
- **Biomarker summary text** — What each biomarker is, why it matters — shown on detail pages.
- **Dashboard enhancements** — Preset templates by category (Heart, Metabolic, Thyroid), shareable/exportable dashboards, summary stats (latest values, trend indicators).
- **Other** — Batch PDF upload, PII stripping before LLM, model comparison diff view, custom per-lab prompt overrides, general code cleanup pass.
