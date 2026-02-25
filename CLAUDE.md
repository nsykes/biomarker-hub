# Biomarker Project

Monorepo for biomarker extraction and health data tools.

## Structure

- `web/` — Next.js 15 app (App Router) for biomarker extraction and health data tracking
- `docs/` — Product context, design decisions, and future plans

## Key Files

- `web/lib/prompt.ts` — LLM extraction prompt (critical — changes affect all extractions)
- `web/lib/highlight.ts` — PDF text highlighting (row-based matching algorithm)
- `web/lib/types.ts` — Shared TypeScript interfaces
- `web/lib/constants.ts` — Shared magic values (API URLs, model defaults, highlight params, flag colors/options)
- `web/lib/unit-conversions.ts` — Display-time unit normalization (converts alternate units to registry canonical units)
- `web/lib/utils.ts` — Shared utilities (formatDate)
- `web/app/api/extract/route.ts` — OpenRouter API route
- `web/lib/db/actions.ts` — Barrel re-export for all server actions (do not add code here — add to sub-modules)
- `web/lib/db/actions/` — Server action sub-modules (auth, reports, settings, biomarkers, account, dashboards)
- `web/components/BiomarkerDetailPage.tsx` — BiomarkerDetailView (inline, self-fetching) + BiomarkerDetailPage (standalone wrapper)
- `web/components/biomarker-detail/` — Detail subcomponents (HistoryChart, HistoryTable, ReferenceRangeSection, helpers)
- `web/components/BiomarkerCombobox.tsx` — Registry-backed biomarker search/select for adding biomarkers after extraction
- `web/components/DatePickerInput.tsx` — Custom calendar popover date picker (no external deps), used in FilesTab filters
- `web/components/PdfPreviewModal.tsx` — Modal for previewing source PDF from history table rows
- `web/components/RangeConflictModal.tsx` — Modal for resolving reference range conflicts between PDF and stored ranges
- `web/components/DeleteAccountModal.tsx` — Confirmation modal for account deletion (type "DELETE" to confirm)
- `web/components/DashboardsTab.tsx` — Dashboard list view with create FAB
- `web/components/DashboardView.tsx` — Single dashboard detail with chart grid and drag-to-reorder
- `web/components/DashboardChartCard.tsx` — Sortable chart card wrapping HistoryChart
- `web/components/CreateDashboardModal.tsx` — Modal for creating/editing dashboards with biomarker selection
- `web/lib/db/actions/dashboards.ts` — Dashboard CRUD + batch chart data server actions
- `web/components/Spinner.tsx` — Shared loading spinner (Spinner, PageSpinner)
- `web/app/api/account/export/route.ts` — CSV export endpoint (all biomarker data)
- `web/lib/db/actions/account.ts` — Account deletion server action
- `web/hooks/useCategoryCollapse.ts` — Shared hook for collapsible category sections

## Dev Commands

```bash
cd web
npm run dev      # localhost:3000
npx tsc --noEmit # type-check
```

## Conventions

- OpenRouter for all LLM calls (ZDR enabled). Default model: Gemini 2.5 Pro.
- Neon Postgres via Drizzle ORM (`DATABASE_URL` env var). All state is fully DB-backed.
- `rawName` = exact text from PDF, `metricName` = normalized clinical name.
- PDF highlighting uses row-based spatial matching, not substring search.

## Keeping Docs Current

**You must proactively update these files as the project evolves. This is not optional — treat it as part of every task.**

- **`docs/PROJECT_CONTEXT.md`** — Update whenever architecture changes, new design decisions are made, features are added/removed, infrastructure changes, or future plans shift. This file should always reflect the current state of the project. Assume this needs updating on nearly every session.
- **`CLAUDE.md` (this file)** — Update when project structure changes (new dirs, key files added/removed), conventions change, or dev commands change.

**NEVER store personal health information (PHI), real biomarker values, patient names, dates of birth, or any real health data in any file in this repo.** This includes `docs/PROJECT_CONTEXT.md`, `CLAUDE.md`, comments in code, test fixtures, etc. The repo is public on GitHub. Use fake/placeholder data for examples.

**Rules:**
- **NEVER ask whether to update — just do it.** No "Want me to capture this?" or "Should I update the docs?" — the answer is always yes.
- If a conversation reveals new context, decisions, direction, or any factual discovery about infrastructure/services/config, capture it immediately in the relevant file before finishing.
- This includes things like: project IDs, org IDs, service names, account details, API configurations, database locations, deployment URLs, env var names — anything that was hard to find or that you'd need to know again in a future session.
- The goal is to never make the user repeat themselves. If they told you something or you discovered something, write it down.
- When making design decisions or architectural changes, record the decision AND the reasoning in `docs/PROJECT_CONTEXT.md` as part of the same action — not as a follow-up.

## Context

See `docs/PROJECT_CONTEXT.md` for product vision, design decisions, and future plans.
