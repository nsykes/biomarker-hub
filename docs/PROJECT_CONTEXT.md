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
- **LLM API:** OpenRouter (env var `OPENROUTER_API_KEY` set in Vercel)
- **Repo:** Monorepo — `web/` is the Next.js 15 app
- **MCP servers configured:** Vercel (`https://mcp.vercel.com`), Neon (`https://mcp.neon.tech`), PitchBook, Granola

The codebase has Drizzle ORM + Neon wiring already in place (`drizzle.config.ts`, `lib/db/`), using `DATABASE_URL` env var. The DB schema stores settings (including OpenRouter API key per-user). In V1, the DB is available but most state is still in-memory with JSON export.

## Architecture

```
Browser (localhost:3000 / Vercel)
├── Left pane: PDF viewer (react-pdf) with text-layer highlighting
├── Right pane: Editable results table grouped by category
└── API route → OpenRouter (Gemini 2.5 Pro default) → structured JSON
```

## Design Decisions

### Reference Ranges: Globally Defined, Not Per-File

Reference ranges should be defined in a central lookup table, not extracted per-file. Reasons:
- Different labs report slightly different ranges for the same biomarker
- Ranges change over time as guidelines update
- We want consistent flagging across all reports

**Current behavior:** Ranges are extracted from the PDF (whatever the lab printed).
**Future behavior:** Compare extracted ranges against our internal definitions. If they disagree, flag for review but use internal ranges for flagging.

### rawName vs metricName

- `rawName`: Exact text from the PDF (e.g., "UREA NITROGEN (BUN)")
- `metricName`: Normalized clinical name (e.g., "Blood Urea Nitrogen")

rawName is used for PDF highlighting (matching against text layer). metricName is for display and cross-report deduplication.

### PDF Highlighting: Row-Based Matching

The highlight algorithm groups text-layer spans into rows by Y-position, then scores each row against the biomarker's rawName + value + unit. Only the single best-matching row gets highlighted. This avoids false positives from substring matching (e.g., value "20" matching "200" or date strings).

### Auth & Data Model: One User = One Patient

Every logged-in user tracks only their own health data — it's a strict 1:1 relationship. Because of this, there's no separate `patients` table. Instead:

- **`neon_auth.user`** handles identity (name, email, sessions, OAuth) — managed by Neon Auth.
- **`profiles`** extends the auth user with health-specific fields (`date_of_birth`, `sex`). Its PK is `user_id`, which is the `neon_auth.user.id`, enforcing 1:1.
- **`reports.user_id`** links directly to the auth user — no intermediary.

```
neon_auth.user (id, name, email — managed by Neon)
  └── profiles (user_id PK/FK, date_of_birth, sex)
  └── reports (user_id FK)
        └── biomarker_results (report_id FK)
```

The old `patients` table was dropped in favor of this design. `name` comes from the auth user, so it's not duplicated in `profiles`.

### LLM Extraction: Page Numbers Are Critical

Every extracted biomarker includes the 1-indexed page number where it appears. This enables click-to-source tracing in the UI. Page accuracy varies by model — Gemini 2.5 Pro is currently the most reliable.

## Future Plans

### Multi-File Support (V2)

Upload multiple health files per product/person. Track the same biomarkers over time:
- Timeline view: line charts showing biomarker values across multiple reports
- Automatic deduplication by metricName across files
- Date-based sorting using collectionDate from each report

### Database Persistence

Neon Postgres is provisioned and schema is live (profiles, reports, biomarker_results, reference_ranges, settings). Drizzle ORM wiring is in place. The `actions.ts` layer now reads/writes the normalized schema (`reports` + `biomarker_results`) and assembles the flat `StoredFile` shape that components expect.

**PDF storage:** Uploaded PDFs are stored as `bytea` in the `reports.pdf_data` column alongside extraction results. A dedicated API route (`/api/reports/[id]/pdf`) handles binary upload (PUT) and retrieval (GET), avoiding server action size limits. List/detail queries exclude the `pdfData` column to avoid loading multi-MB blobs unnecessarily — the `pdfSizeBytes` field tells the UI whether a PDF exists without loading it. When viewing a saved report, the PDF is fetched on demand and displayed in the split-pane viewer.

Remaining work:
- Enable trend queries across reports
- Support re-extraction with improved prompts

### MCP Server

Expose biomarker data as an MCP server so Claude/ChatGPT can:
- Answer questions about health trends
- Compare values against reference ranges
- Summarize changes between reports

### Biomarker Detail Pages (Implemented)

Each biomarker in the Biomarkers tab links to a dedicated detail page at `/biomarkers/[slug]`:

1. **Historical chart** — Recharts `LineChart` showing all numeric values over time, with data points colored by flag status. Reference range displayed as a shaded zone when available.
2. **History table** — All data points (newest first) with date, value, unit, flag, and source (filename + lab name).
3. **Reference range section** — Shows custom range from `reference_ranges` table if set, otherwise "No custom reference range set" with disabled Edit button (future). Also shows unique lab-reported ranges from extraction data.

**Architecture:**
- Route: `web/app/biomarkers/[slug]/page.tsx` (server component — looks up registry entry, fetches data via `getBiomarkerDetail()`)
- Client component: `web/components/BiomarkerDetailPage.tsx` (chart, table, reference range section)
- Server action: `getBiomarkerDetail(slug)` joins `biomarker_results` with `reports`, sorted by `collection_date ASC`. Uses `idx_biomarker_results_slug_report` index.
- `reference_ranges` DB table exists but is empty — infrastructure ready for future editing UI.
- BiomarkersTab rows are now `<Link>` elements pointing to `/biomarkers/[slug]` (replaced inline expand/collapse).
- AppShell reads `?tab=` query param on mount for back-navigation from detail pages (`/?tab=biomarkers`).
- Charting: `recharts` library added as dependency.

**Remaining work:**
- Biomarker summary/explanation text (what it is, why it matters)
- Editable reference ranges UI (currently disabled Edit button)
- Link from history table rows back to the source report

### Extraction UX Improvements

Several changes to the upload/extraction flow:

1. **Remove per-extraction model selector** — The model is already configurable in Settings. Showing it on every extraction is unnecessary clutter. Just use the default model from settings. Remove the model picker from the extraction UI entirely.

2. **Remove lab-specific branding from upload UI** — Don't say "supports Function Health, Quest, BodySpec" etc. The extractor should work with any lab report PDF. Keep the UI generic.

3. **Auto-extract date and vendor** — When a PDF is uploaded, the LLM should extract:
   - **Collection date** — when the lab work was done (already partially done via `collectionDate`, but should be more prominent and always extracted)
   - **Vendor/lab name** — who produced the report (Function Health, Quest, BodySpec, etc.) — already partially done via `source`/`labName`, but should be surfaced clearly in the UI
   - Both fields should be **editable** by the user after extraction (the LLM will get it wrong sometimes)

4. **Add/delete biomarkers after extraction** — Users need to correct extraction errors:
   - **Delete** — Remove a biomarker the LLM hallucinated or extracted incorrectly
   - **Add** — Add a biomarker the LLM missed. The biomarker name should be a **dropdown from the canonical biomarker list**, not free text, to maintain consistency across reports. (This requires a canonical biomarker registry — ties into the reference range work.)

### Biomarkers Tab UX

- **Expand all / Collapse all** — Add a toggle button to the Biomarkers tab to expand or collapse all biomarker category groups at once.

### Other Future Items

- Batch PDF processing (upload multiple files at once)
- PII stripping before sending to LLM
- Model comparison diff view (run same PDF through multiple models)
- Custom per-lab extraction prompt overrides

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

## Registry: fullName + Audit Sync (2026-02-23)

The `CanonicalBiomarker` interface now includes a `fullName` field alongside `displayName`. For most entries fullName === displayName, but abbreviations get expanded clinical names (e.g. displayName "AST", fullName "Aspartate Aminotransferase"). This supports:
- **Search**: BiomarkersTab search matches against fullName, so "aminotransferase" finds AST/ALT
- **Detail pages**: fullName shown as subtitle under displayName when they differ
- **Reference/accessibility**: Full clinical names available for tooltips, exports, etc.

**Category corrections** (from audit reconciliation):
- `homocysteine`: Metabolic → Heart
- `rheumatoid-factor`: Inflammation → Autoimmune
- `methylmalonic-acid`: Metabolic → Vitamins
- `leptin`: Metabolic → Endocrinology
- `magnesium-rbc`: Vitamins → Electrolytes

**New entry:** `non-hdl-cholesterol` (Heart category)

**New aliases added:** MCHC → "MEAN CORPUSCULAR HEMOGLOBIN CONCENTRATION", eGFR → "ESTIMATED GLOMERULAR FILTRATION RATE", tTG IgG/IgA → "TISSUE TRANSGLUTAMINASE ANTIBODY IGG/IGA", TPO → "THYROID PEROXIDASE ANTIBODY" (singular)

DEXA generators (body comp + bone) also propagate fullName through their metric arrays (e.g. BMD → "Bone Mineral Density", BMC → "Bone Mineral Content").

## Biomarker Audit (2026-02-23)

A comprehensive multi-wave audit was conducted across all 4 example PDFs (320 biomarker instances, 166 unique types). All audit files live in `docs/audit/`.

**Result: PASS (with conditions)**

Key findings:
- Zero missing biomarkers, zero phantom entries across all 4 PDFs
- 11 metricName normalization inconsistencies (all in PDF3 — abbreviations vs expanded names). Fixed by expanding Rule 12 normalization examples.
- 3 category inconsistencies (thyroid antibodies, insulin). Fixed by adding category guidance to Rule 10.
- 6 unit inconsistencies (all "(calc)" suffix). Fixed by adding stripping rule to Rule 12.
- PDF4 pixel-level verification was CONDITIONAL (pdftoppm not available for direct PDF rendering). Internal consistency and cross-audit validation confirmed all 124 biomarkers correct.

**Conditions remaining for full pass:**
- Install poppler (`brew install poppler`) and re-run PDF3/PDF4 pixel verification to confirm values against actual PDF rendering. Current risk: very low — all values cross-validated via internal consistency and cross-audit comparison.

**Audit file index:**
- `pdf1-blood-results-audit.md` — 47 biomarkers (PASS)
- `pdf2-dexa-scan-audit.md` — 64 biomarkers (PASS)
- `pdf3-lab-results-1-audit.md` — 85 biomarkers (PASS)
- `pdf4-lab-results-2-audit.md` — 124 biomarkers (PASS)
- `pdf1-crosscheck.md`, `pdf2-crosscheck.md` — Independent verifications (PASS)
- `pdf3-crosscheck.md`, `pdf4-crosscheck.md` — Independent verifications (CONDITIONAL PASS)
- `pdf3-pixel-verification.md` — Pixel-level verification (PASS)
- `pdf4-pixel-verification.md`, `pdf4-final-pixel-verification.md` — Pixel-level attempts (CONDITIONAL PASS)
- `cross-pdf-consistency-check.md` — Cross-PDF consistency (CONDITIONAL PASS)
- `FINAL-RECONCILIATION.md` — Master reconciliation with canonical biomarker registry (166 types)
