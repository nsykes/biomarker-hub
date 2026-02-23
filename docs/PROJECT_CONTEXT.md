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

Neon Postgres is provisioned and schema is live (profiles, reports, biomarker_results, settings). Drizzle ORM wiring is in place. Remaining work:
- Wire up the app to read/write from Postgres instead of in-memory state
- Enable trend queries across reports
- Support re-extraction with improved prompts

### MCP Server

Expose biomarker data as an MCP server so Claude/ChatGPT can:
- Answer questions about health trends
- Compare values against reference ranges
- Summarize changes between reports

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
