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

The codebase has Drizzle ORM + Neon wiring already in place (`drizzle.config.ts`, `lib/db/`), using `DATABASE_URL` env var. The DB schema stores per-user settings (OpenRouter API key, default model) and all report/biomarker data scoped by user ID. Auth is via Neon Auth (Google OAuth). In V1, the DB is available but most state is still in-memory with JSON export.

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
3. **Reference range section** — Shows custom range from `reference_ranges` table (auto-backfilled from lab data on first visit if needed). One-sided ranges display as "< X" or "> X" instead of "? – X". Goal direction shown inline (e.g., "< 200 mg/dL (goal: below)"). Falls back to "No custom reference range set" only if no lab data exists at all. Also shows unique lab-reported ranges from extraction data.

**Architecture:**
- Route: `web/app/biomarkers/[slug]/page.tsx` (server component — looks up registry entry, fetches data via `getBiomarkerDetail()`)
- Client component: `web/components/BiomarkerDetailPage.tsx` (chart, table, reference range section)
- Server action: `getBiomarkerDetail(slug)` joins `biomarker_results` with `reports`, sorted by `collection_date ASC`. Uses `idx_biomarker_results_slug_report` index.
- `reference_ranges` DB table is auto-populated from PDF extractions (see "Extraction View Improvements" section).
- BiomarkersTab rows are now `<Link>` elements pointing to `/biomarkers/[slug]` (replaced inline expand/collapse).
- AppShell reads `?tab=` query param on mount for back-navigation from detail pages (`/?tab=biomarkers`).
- Charting: `recharts` library added as dependency.

**Remaining work:**
- Biomarker summary/explanation text (what it is, why it matters)
- Link from history table rows back to the source report

### Extraction View Improvements (Implemented — 2026-02-23)

Four changes to the extraction step UI:

1. **Page column removed** — The "Page" column and `onPageClick` handler removed from the results table. Row click already navigates to the correct page via `handleSelectBiomarker` → `buildHighlightTarget` → PdfViewer page-change effect, making the separate page button redundant. Column count reduced from 7 to 6.

2. **Re-attempt extraction button** — After extraction completes, the "Extract Biomarkers" button changes to gray "Re-attempt Extraction" with a `window.confirm()` guard. Before first extraction, the button remains blue.

3. **Reference range auto-population** — When biomarkers are extracted from a PDF, their reference ranges are automatically saved to the `reference_ranges` table if no stored range exists. If a stored range already exists and differs from the PDF, a conflict modal appears letting the user choose "Keep stored" or "Use PDF range" per biomarker.
   - New server actions: `reconcileReferenceRanges()` (batch compare + auto-insert), `updateReferenceRange()` (upsert single range)
   - New component: `RangeConflictModal.tsx`
   - New type: `ReferenceRangeConflict` in `types.ts`

4. **Highlight scroll jump-back fix** — The `handleTextLayerSuccess` callback in PdfViewer previously depended on `[highlightTarget, currentPage]`, causing react-pdf to re-render the text layer when clicking different biomarkers. This interrupted `scrollIntoView` smooth animations. Fixed by storing highlight target and current page in refs, making the callback stable (empty dependency array), and adding a separate `useEffect` for same-page highlight changes using `requestAnimationFrame`.

**Files changed:** `ResultsPanel.tsx`, `BiomarkerRow.tsx`, `ExtractionView.tsx`, `PdfViewer.tsx`, `types.ts`, `lib/db/actions/biomarkers.ts`, `lib/db/actions.ts`
**New files:** `components/RangeConflictModal.tsx`

### Extraction UX Improvements (Implemented — 2026-02-23)

Four changes to clean up the extraction experience:

1. **Per-extraction model selector removed** — The model is configured in Settings and used automatically. `ModelSelector.tsx` deleted; `SettingsTab` uses an inline `<select>` from `AVAILABLE_MODELS`.

2. **Lab-specific branding removed** — Upload zone now says "Upload any lab report PDF" instead of listing specific labs.

3. **Editable report info bar** — After extraction, a blue info bar shows collection date, source, and lab name — all inline-editable (click-to-edit, blur/Enter saves, Escape cancels). Edits persist to DB via `updateReportInfo` server action.

4. **Add/delete biomarkers** — Users can correct extraction errors:
   - **Delete** — X button on each biomarker row removes it from state and syncs to DB.
   - **Add** — "Add Biomarker" button below the table opens a `BiomarkerCombobox` that searches the canonical registry (134+ entries) by displayName, fullName, and aliases. Selecting an entry creates a new biomarker row with registry defaults.

**New files:** `components/BiomarkerCombobox.tsx`
**Deleted files:** `components/ModelSelector.tsx`
**New server action:** `updateReportInfo(id, { source?, labName?, collectionDate? })` in `lib/db/actions/reports.ts`

### Editable Reference Ranges + Expand/Collapse All (Implemented — 2026-02-23)

**Editable reference ranges:** The biomarker detail page's Reference Range card now has a working Edit/Set Range button. When a range exists, clicking "Edit" opens an inline form with Low, High, and Unit fields. When no range exists, "Set Range" opens the same form. Save calls `updateReferenceRange()` server action with optimistic local state update. Goal direction is auto-inferred client-side via `inferGoalDirection()`. Clearing both Low and High clears the range entirely. Cancel discards edits.

**Expand/Collapse All:** Both the Biomarkers tab and ResultsPanel extraction table have a toggle button. Shows "Collapse All" when all categories are expanded, "Expand All" when any are collapsed. The `useCategoryCollapse` hook now exposes `expandAll()`, `collapseAll(categories)`, and `anyCollapsed` boolean.

**Files changed:** `components/biomarker-detail/ReferenceRangeSection.tsx`, `components/BiomarkerDetailPage.tsx`, `hooks/useCategoryCollapse.ts`, `components/BiomarkersTab.tsx`, `components/ResultsPanel.tsx`

### Unknown Biomarker Remapping (Implemented — 2026-02-23)

When the LLM extracts a biomarker that doesn't match the canonical registry, `matchBiomarker()` returns null and `canonicalSlug` is stored as null. These biomarkers are saved in the DB with all data intact but are hidden from the Biomarkers tab (which filters out null slugs).

**Solution:** During extraction review, unmatched biomarkers show an amber "Unmatched" badge next to the metric name in `BiomarkerRow`. Clicking the badge opens a `BiomarkerCombobox` inline, letting the user search and select the correct registry entry. On selection, the row's `canonicalSlug`, `metricName`, and `category` are updated from the registry (unit is set only if currently null). The original `rawName`, `value`, reference ranges, `flag`, and `page` are preserved. After remapping, the biomarker appears in the Biomarkers tab and trend charts like any other matched entry.

### Remove Server-Side API Key (Implemented — 2026-02-23)

The server-side `OPENROUTER_API_KEY` env var fallback has been removed. Each user must provide their own OpenRouter API key in Settings. The extract route returns a 400 with a clear message if no key is provided. The UI disables the extract button and shows an inline message when no API key is configured.

### Privacy & Data Flow Audit

Before sharing the app with friends/family, do a thorough review of the full data flow and all third-party sub-processors to be able to clearly answer privacy questions:

- What data leaves the browser and where does it go? (OpenRouter, Neon, Vercel, etc.)
- What does OpenRouter do with the PDF content sent for extraction? Retention policies?
- What does Neon store and where? Encryption at rest?
- What does Vercel have access to? Logs, request bodies?
- Is any data sent to places we don't realize? (analytics, error tracking, etc.)
- Can we offer a clear, plain-language privacy summary for users?

Goal: be able to confidently explain to a non-technical user exactly what happens with their health data.

### New Extraction Empty State & Settings Link Fix (Implemented — 2026-02-23)

Two UX fixes:

1. **Single-column empty state** — When no file is selected on the New Extraction page, the awkward two-panel split pane is replaced with a full-width centered upload zone. The `<SplitPane>` only renders after a file is selected. An API key warning shows below the upload zone if no key is configured.

2. **Broken Settings link removed** — `<UserButton disableDefaultLinks />` prevents the profile dropdown from rendering a "Settings" link to the nonexistent `/account/settings` route. Sign Out still works.

3. **Upload zone visual polish** — Added an upload icon (inline SVG) above the text, refined padding and typography.

**Files changed:** `ExtractionView.tsx`, `UploadZone.tsx`, `AppShell.tsx`

### UI Polish Pass (Implemented — 2026-02-23)

Comprehensive visual overhaul across all 22 component files, inspired by Apple Health / Apple system design. Changes:

**Design system foundations (`globals.css`):**
- Full CSS custom property system: primary accent (Apple system blue `#0A84FF`), health status flag colors (Apple system colors), warmer Apple-style neutrals, shadow/radius tokens
- Base utility classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input-base` for consistent styling
- Body font fixed from hardcoded Arial to `var(--font-sans)` (Geist Sans)
- Body background changed to off-white `--color-surface-secondary`

**Color palette:**
- Primary: `#0A84FF` (Apple system blue) with hover `#0070E0` and light bg `#E8F4FD`
- Flag colors updated to Apple system colors: Normal `#34C759`, Low `#5856D6`, High `#FF3B30`, Abnormal `#FF9500`, Critical Low `#3634A3`, Critical High `#C5221F`
- Warmer neutrals: borders `#E5E5EA`, text primary `#1C1C1E`, secondary `#636366`, tertiary `#AEAEB2`

**Component changes:**
- **AppShell:** Frosted-glass header (`bg-white/80 backdrop-blur-lg`), pill-style tab navigation with primary-light active state
- **FilesTab:** Card-wrapped table, tertiary header bg, primary-light row hover, gradient blue FAB with scale animation
- **BiomarkersTab:** Primary focus ring search input, chevron SVG icons (replacing unicode), primary-light count badges and row hover
- **SettingsTab:** Card-wrapped sections, softer section titles, blue-tinted privacy FAQ card
- **BiomarkerDetailPage:** Off-white page bg, arrow-icon back link, `text-2xl` title, primary-light category badge, card-wrapped sections
- **HistoryChart:** Primary blue data line, larger dots (r=6), updated grid/zone/tooltip colors
- **HistoryTable:** Card-wrapped with rounded border, tertiary header bg, primary-light row hover
- **ReferenceRangeSection:** Goal direction colored badges, left-border accent on lab ranges
- **ExtractionView:** Frosted-glass header, rounded error banner with icon, amber API key warning card
- **ResultsPanel:** Primary/secondary button styles, subtle action bar shadow, chevron category icons
- **BiomarkerRow:** Primary-light selected state with primary left border (replacing yellow), rounded hover states
- **SplitPane:** Wider handle (`w-1.5`), grip indicator dots, primary color on hover/drag
- **PdfViewer:** Clean white toolbar, chevron nav icons, consistent rounded button style
- **UploadZone:** Rounded-2xl container, primary-tinted icon, hover/drag states in primary colors
- **RangeConflictModal:** Frosted backdrop, `rounded-2xl` modal, close X button, primary selection styling
- **Auth page:** Off-white bg, app name branding above auth form
- **FlagBadge/Spinner:** Updated to Apple system colors

### Neon Auth (Implemented — 2026-02-23)

Auth is live using **`@neondatabase/auth@^0.2.0-beta.1`** (standalone package, powered by Better Auth under the hood). Google OAuth is the primary sign-in method.

**What's in place:**
- **Per-user data isolation** — all DB actions (`getFiles`, `saveFile`, `getSettings`, `saveSettings`, `getBiomarkerDetail`) are scoped by `userId` from the session. No user can see another user's data.
- **Settings migrated from global to per-user** — each user gets their own settings row (API key, default model). The old global settings row was dropped.
- **Orphan auto-claim** — `getFiles()` detects reports with `user_id IS NULL` (uploaded before auth existed) and assigns them to the current user on first load. One-time migration path.
- **Route protection** — middleware protects `/`, `/biomarkers/*`, `/api/extract`, `/api/reports/*`. Unauthenticated requests redirect to `/auth/sign-in`.
- **API guards** — extract and PDF routes return 401 without a valid session. PDF route also verifies report ownership.

**File structure:**
- `lib/auth/server.ts` — `createNeonAuth()` server instance
- `lib/auth/client.ts` — `createAuthClient()` client instance (`'use client'`)
- `components/AuthProvider.tsx` — wraps app with `NeonAuthUIProvider` (Google social provider)
- `app/api/auth/[...path]/route.ts` — auth API catch-all (`auth.handler()`)
- `app/auth/[path]/page.tsx` — sign-in/sign-up UI (`<AuthView>`)
- `middleware.ts` — route protection via `auth.middleware({ loginUrl })`
- `app/layout.tsx` — wraps children with `<AuthProvider>`
- `components/AppShell.tsx` — `<UserButton>` in header

### Codebase Refactor (2026-02-23)

Full structural cleanup — no functionality changes.

**Shared foundation:**
- `lib/constants.ts` — consolidated magic values (API URLs, model defaults, highlight params, flag colors/options) previously scattered across 7+ files
- `lib/utils.ts` — shared `formatDate` utility (previously duplicated in BiomarkerDetailPage)
- `hooks/useCategoryCollapse.ts` — shared hook for collapsible category sections (previously duplicated in ResultsPanel and BiomarkersTab)
- `components/Spinner.tsx` — shared `Spinner` and `PageSpinner` components (previously duplicated inline in 4 files)
- `.env.example` — documents required env vars

**BiomarkerDetailPage split (362 → 73 lines):**
- `components/biomarker-detail/HistoryChart.tsx` — chart with CustomDot, CustomTooltip
- `components/biomarker-detail/HistoryTable.tsx` — history table
- `components/biomarker-detail/ReferenceRangeSection.tsx` — reference range display
- `components/biomarker-detail/helpers.ts` — `formatValue` utility
- `components/BiomarkerDetailPage.tsx` — thin composer importing subcomponents

**Type cleanup:** BiomarkersTab local `BiomarkerHistory` interface replaced with `BiomarkerHistoryPoint` from types.ts (was a subset duplicate).

**AppShell cleanup:** Removed unnecessary `dynamic()` import for ExtractionView (PdfViewer handles its own `ssr: false`). Derived `VALID_TABS` from `TABS` array instead of maintaining duplicate.

### DB Actions: Modular Barrel Re-export (2026-02-23)

The monolithic `lib/db/actions.ts` has been split into focused sub-modules under `lib/db/actions/`. The original file is now a barrel re-export, so all existing imports (`import { ... } from '@/lib/db/actions'`) continue to work unchanged.

**Sub-modules:**
- `lib/db/actions/auth.ts` — `requireUser()` helper (session guard)
- `lib/db/actions/reports.ts` — File/report CRUD (`getFiles`, `getFile`, `saveFile`, `deleteFile`, `updateFileBiomarkers`) plus internal helpers (`reportColumns`, `ReportRow`, `toBiomarker`, `toMeta`, `toStoredFile`, `biomarkerToRow`)
- `lib/db/actions/settings.ts` — `getSettings`, `updateSettings`
- `lib/db/actions/biomarkers.ts` — `getBiomarkerDetail`, `getReferenceRange`, `backfillReferenceRange`
- `lib/db/actions.ts` — Barrel file re-exporting all public functions

Each sub-module has its own `"use server"` directive. Internal helpers in `reports.ts` are not exported.

**Env vars:**
- `NEON_AUTH_BASE_URL` — from Neon dashboard Auth tab
- `NEON_AUTH_COOKIE_SECRET` — 32+ chars, generate with `openssl rand -base64 32`

**Session access:** `auth.getSession()` returns `{ data: { session, user } | null, error }`. Server components using it must export `dynamic = 'force-dynamic'`. Client-side: `authClient.useSession()` hook.

**DB migration applied (2026-02-23):** `settings` table now has `user_id UUID NOT NULL UNIQUE` column. Old global settings row was deleted — users re-enter API key after signing in.

**Setup prerequisites (manual):**
1. Neon dashboard → Auth tab → enable Google as social provider (requires Google OAuth client ID/secret)
2. Neon dashboard → Auth tab → copy `NEON_AUTH_BASE_URL`
3. Add `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` to `.env.local` (local) and Vercel project env vars (production)

### Unit Normalization Across Labs (Implemented — 2026-02-23)

Different labs report the same biomarker in different units (e.g., glucose in mg/dL vs mmol/L). The app now normalizes values to the registry's canonical unit at display time using a deterministic conversion table based on molecular weights.

**Design decisions:**
- **Display-time normalization, not ingestion-time** — originals stored in DB untouched, conversion applied when rendering charts/tables. This preserves source data fidelity and makes conversions reversible.
- **Hardcoded lookup table** (`web/lib/unit-conversions.ts`) — ~17 conversion entries covering all common biomarkers. Conversion factors are well-established medical constants (based on molecular weights), so a static table is appropriate. No DB storage needed.
- **Missing/unrecognized units pass through unchanged** — if unit is null or not in the conversion table, the original value is shown as-is. No data is ever lost or corrupted.

**What's normalized:**
- **History chart** — Y-axis plots all values in canonical unit, tooltip shows canonical unit
- **History table** — converted rows show normalized value with original in gray parentheses (e.g., "95.0 (5.27 mmol/L)")
- **Reference range section** — lab-reported ranges normalized before deduplication, so equivalent ranges in different units collapse into one
- **Y-axis bounds** — lab-reported reference ranges from history points are normalized before computing chart bounds

**Covered conversions:** Glucose, Total/HDL/LDL/Non-HDL Cholesterol, Triglycerides, Calcium, Creatinine, Uric Acid, BUN, Bilirubin Total, Iron Total, Ferritin, TIBC, Testosterone Total/Free, Cortisol, Insulin, Homocysteine, Vitamin D.

**New file:** `web/lib/unit-conversions.ts` — `normalizeUnitString()` and `convertToCanonical()` functions.

### Chunked PDF Extraction for Large Reports (Implemented — 2026-02-24)

Large PDFs (17+ pages, 150+ biomarkers) caused 504 gateway timeouts on Vercel because a single LLM call generating ~20K+ output tokens took longer than the function timeout allowed.

**Solution:** PDFs exceeding `CHUNK_PAGE_THRESHOLD` (8 pages) are split into chunks of `CHUNK_SIZE` (6 pages) using `pdf-lib`. Each chunk is extracted in parallel via `Promise.all()`, then results are merged:
- `reportInfo` taken from the first chunk (page 1 has patient/lab info)
- Biomarker page numbers adjusted by chunk offset to preserve correct PDF page references
- Lightweight dedup by `rawName|value` handles page-boundary overlaps
- Token usage aggregated across all chunks

A `FETCH_TIMEOUT_MS` (240s) `AbortController` wraps all fetch calls as a safety net before Vercel kills the function. `maxDuration` is set to 300s to use full Vercel Pro headroom. Small PDFs (≤8 pages) use the single-call path unchanged.

**Stream keep-alive (2026-02-24):** Long extractions (up to ~240s) caused `ERR_NETWORK_IO_SUSPENDED` because the browser killed the idle connection when no bytes were sent. Fix: the extract route now returns a `ReadableStream` that sends a space byte every 15s as keep-alive, then writes the JSON result at the end. Leading whitespace is valid before JSON — the client reads the full body with `response.text()`, trims, and parses. Early validation errors (auth, missing file) still return normal `NextResponse.json()` with proper status codes; streaming only wraps the long-running extraction phase. HTTP 200 is always returned for streamed responses since headers are sent before the outcome is known — errors are encoded in the JSON body and the client checks for `parsed.error`.

**Dependency added:** `pdf-lib` (lightweight, zero-dependency PDF manipulation)

**Files changed:** `web/app/api/extract/route.ts`, `web/lib/constants.ts`

### Bad PDF Handling

The app currently assumes uploaded files are well-formed lab report PDFs with a text layer. We need graceful handling for common failure cases:

- **Image-only PDFs** (scanned documents with no text layer) — the LLM receives no text to extract from. Detect this and show a clear error suggesting the user needs an OCR'd version.
- **Non-lab-report PDFs** — someone uploads a random document. The LLM will return empty or garbage results. Detect zero-biomarker extractions and show a helpful message.
- **Corrupted/unreadable files** — malformed PDFs that fail to parse. Catch errors from react-pdf and show a user-friendly error instead of a blank screen.
- **Password-protected PDFs** — some lab portals generate these. Detect and inform the user.

Goal: no matter what file someone uploads, they get a clear, helpful message — never a broken UI or cryptic error.

### Data Export — CSV (Implemented — 2026-02-24)

Users can download all their biomarker data as a CSV file from Settings → Export Data. The GET endpoint at `/api/account/export` joins `biomarker_results` with `reports`, sorted by collection date then category. Columns: Date, Biomarker, Value, Unit, Flag, Reference Range Low/High, Source File, Lab Name. Empty accounts get a header-only CSV. Auth-guarded (401 for unauthenticated requests).

**Future:** JSON export, FHIR format, per-report export.

### Account Deletion (Implemented — 2026-02-24)

Users can permanently delete their account and all data from Settings → Delete Account. A confirmation modal requires typing "DELETE" to enable the button. On confirm:
1. `deleteAccount()` server action deletes reports (CASCADE → biomarker_results), settings, and profile
2. Client-side `authClient.signOut()` clears the session
3. Full page redirect to `/auth/sign-in`

Does NOT delete `reference_ranges` (global, not user-scoped). Auth user record deletion is handled by the signOut/session expiry flow.

### Mobile Responsiveness (Lower Priority)

The current layout is desktop-oriented (split-pane PDF viewer + results table). Lab results are something people check on their phone, so the app should be usable on small screens. Considerations:

- The split-pane extraction view won't work on mobile — needs a stacked or tabbed layout
- Biomarkers tab and detail pages are more straightforward to make responsive
- Charts (Recharts) may need touch-friendly sizing and interactions
- Settings page should be responsive

### Trend Alerts (Lowest Priority)

Beyond single-report flags (high/low), the app could surface when a biomarker is trending in a concerning direction across multiple reports. For example:

- A value that's still in range but has been steadily increasing over 3+ reports
- A value that crossed from normal to abnormal between the two most recent reports
- Significant jumps between consecutive readings

This is a nice-to-have that depends on multi-file support and unit normalization being in place first.

### Extraction Results: Group by Page, Not Category (Implemented — 2026-02-24)

During extraction review, the right panel previously grouped biomarkers by category (Liver, Electrolytes, etc.), which caused the user to jump between different PDF pages as they scan down the list. Grouping by page makes left and right panels flow together.

**Change:** The results table now groups biomarkers by **page number** instead of category. Group headers show "Page 1 (n)", "Page 2 (n)", etc., sorted by page number. A **Category column** was added to the results table so that information isn't lost. Column order: Metric | Category | Value | Unit | Ref Range | Flag | [delete]. ColSpan updated from 6 to 7 for group header rows and remap rows. Expand/Collapse All works with string-coerced page keys.

**Files changed:** `components/ResultsPanel.tsx`, `components/BiomarkerRow.tsx`

### Undo for Biomarker Deletion (Implemented — 2026-02-24)

Deleting a biomarker during extraction review now shows a toast with an "Undo" button for 5 seconds. If undo is clicked, the biomarker is restored at its original position. If the toast expires, deletion is finalized to DB. DB sync is deferred until the toast disappears (no unnecessary writes on undo).

**Behavior:**
- One toast at a time — deleting B while A's toast is showing finalizes A immediately and shows B's toast
- Back button flushes any pending deletion before navigating away
- Custom toast component (`UndoToast.tsx`) — no UI library added, consistent with hand-rolled design system

**Files changed:** `components/ExtractionView.tsx`, `lib/constants.ts`
**New files:** `components/UndoToast.tsx`

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

### Server Action Error Sanitization Fix (Implemented — 2026-02-23)

Next.js production builds sanitize errors thrown by server actions — the client receives a generic "An unexpected response was received from the server" instead of the actual error message. This made the Settings tab show "Failed to load settings" with no diagnostic information.

**Fix:** Added `getSettingsSafe()` and `updateSettingsSafe()` wrapper functions that catch errors server-side and return them as `{ data, error }` discriminated unions. Returned data is properly serialized by Next.js (only thrown errors are sanitized). SettingsTab and ExtractionView now use the safe wrappers, so real error messages (e.g., "Unauthorized", "column user_id does not exist") propagate to the UI. The load error banner includes a Retry button.

**Files changed:** `lib/db/actions/settings.ts`, `lib/db/actions.ts`, `components/SettingsTab.tsx`, `components/ExtractionView.tsx`

### Middleware Server Action Bypass (Implemented — 2026-02-23)

The Neon Auth middleware (`auth.middleware()`) was intercepting ALL requests matching the middleware config — including server action POST requests to `/`. When the upstream session check failed or timed out, it redirected to `/auth/sign-in`. The redirect response was HTML, which the server action client couldn't parse as React Flight data, producing the generic "An unexpected response was received from the server" error. This affected the Settings and Files tabs.

**Root cause:** The middleware auth check was redundant for server actions — every server action already authenticates independently via `requireUser()` → `auth.getSession()`. The middleware intercepts requests BEFORE the server action function executes, so the `getSettingsSafe()` try/catch couldn't catch this failure.

**Fix:** The middleware now detects server action requests via the `next-action` header and passes them through immediately with `NextResponse.next()`. Page-level auth protection is unchanged — unauthenticated users visiting `/` are still redirected to sign-in. Also added explicit `size="icon"` prop to `<UserButton>` to suppress a console warning.

**Files changed:** `middleware.ts`, `components/AppShell.tsx`

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
