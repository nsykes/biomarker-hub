# Biomarker Project

Monorepo for biomarker extraction and health data tools.

## Structure

- `web/` — Next.js 16 app (App Router) for biomarker extraction and health data tracking
- `mcp/` — MCP server (stdio) for exposing biomarker data to LLMs (Claude Desktop, ChatGPT, etc.). Design philosophy: return raw factual data (values, flags, directions, reference ranges) — no subjective interpretation (no sentiment/good/bad). Let the consuming LLM decide what matters.
- `docs/` — Product context, design decisions, and future plans

## Key Files

- `web/lib/prompt.ts` — LLM extraction prompt (critical — changes affect all extractions)
- `web/lib/highlight.ts` — PDF text highlighting (row-based matching algorithm)
- `web/lib/types.ts` — Shared TypeScript interfaces
- `web/lib/constants.ts` — Shared magic values (API URLs, model defaults, highlight params, flag colors/options). `FLAG_COLORS` and `FLAG_OPTIONS` are strictly typed to `BiomarkerFlag`.
- `web/lib/unit-conversions.ts` — Display-time unit normalization (converts alternate units to registry canonical units)
- `web/lib/derivative-calc.ts` — Auto-calculation of derivative biomarkers (ratios, sums) from extracted components
- `web/lib/utils.ts` — Shared utilities (formatDate)
- `web/lib/biomarker-registry/` — Biomarker registry directory (types, data, matching logic). Barrel re-exports from `index.ts`.
- `web/app/api/extract/route.ts` — OpenRouter API route
- `web/lib/db/actions.ts` — Barrel re-export for all server actions (do not add code here — add to sub-modules)
- `web/lib/db/actions/` — Server action sub-modules (auth, reports, settings, biomarkers, account, dashboards, api-keys)
- `web/lib/db/queries/biomarkers.ts` — Shared query functions (accept userId param, used by both server actions and API routes)
- `web/lib/db/result.ts` — `SafeResult<T>` and `ActionResult` types for error-as-data server actions
- `web/lib/db/helpers.ts` — `firstOrNull`/`firstOrThrow` DB query helpers
- `web/lib/api-auth.ts` — API key authentication helper for v1 API routes
- `web/app/api/v1/` — External API routes (Bearer token auth via API keys) for MCP server and integrations
- `web/components/BiomarkerDetailPage.tsx` — BiomarkerDetailView (inline, self-fetching) + BiomarkerDetailPage (standalone wrapper)
- `web/components/biomarker-detail/` — Detail subcomponents (HistoryChart, HistoryTable, ReferenceRangeSection, helpers)
- `web/components/BiomarkerCombobox.tsx` — Registry-backed biomarker search/select for adding biomarkers after extraction
- `web/components/ReportInfoField.tsx` — Inline-editable field for report info (date, source, lab)
- `web/components/DatePickerInput.tsx` — Custom calendar popover date picker (no external deps), used in FilesTab filters
- `web/components/PdfPreviewModal.tsx` — Modal for previewing source PDF from history table rows
- `web/components/RangeConflictModal.tsx` — Modal for resolving reference range conflicts between PDF and stored ranges
- `web/components/DeleteAccountModal.tsx` — Confirmation modal for account deletion (type "DELETE" to confirm)
- `web/components/ThemeToggle.tsx` — Light/dark/system theme toggle (cycles light→dark→system)
- `web/components/UserMenu.tsx` — Header user dropdown (name, email, sign-out) using authClient.useSession()
- `web/components/SettingsTab.tsx` — Settings page layout, composes section components from `settings/`
- `web/components/settings/` — Settings section components (ApiKeySection, ModelSection, PrivacySection, ExportSection, ApiKeysSection, PasswordSection, DeleteAccountSection)
- `web/components/DashboardsTab.tsx` — Dashboard list view with create FAB
- `web/components/DashboardView.tsx` — Single dashboard detail, composes subcomponents from `dashboard/`
- `web/components/dashboard/` — Dashboard subcomponents (DashboardHeader, DashboardGrid, DashboardEmptyState)
- `web/components/DashboardChartCard.tsx` — Sortable chart card wrapping HistoryChart, with trend indicator
- `web/components/MultiMetricChart.tsx` — Multi-line Recharts chart for overlaid biomarker comparison
- `web/components/MultiMetricChartCard.tsx` — Sortable card wrapper for MultiMetricChart with split/ungroup
- `web/components/CreateDashboardModal.tsx` — Modal for creating/editing dashboards with templates and biomarker grouping
- `web/lib/db/actions/dashboards.ts` — Dashboard CRUD + batch chart data + group/ungroup server actions
- `web/lib/trend.ts` — Trend computation (latest value, direction, sentiment) for dashboard cards
- `web/components/Spinner.tsx` — Shared loading spinner (Spinner, PageSpinner)
- `web/app/api/account/export/route.ts` — CSV export endpoint (all biomarker data)
- `web/lib/db/actions/account.ts` — Account deletion server action
- `web/hooks/useNavigationState.ts` — Centralized browser history + navigation state hook (tabs, detail views, extraction)
- `web/hooks/useChartColors.ts` — Reads computed CSS color vars for Recharts (re-runs on theme change)
- `web/hooks/useCategoryCollapse.ts` — Shared hook for collapsible category sections
- `web/hooks/useExtractionState.ts` — Extraction state + callbacks (extracted from ExtractionView)
- `web/hooks/useUndoDelete.ts` — Undo-delete pattern with toast (extracted from ExtractionView)
- `web/hooks/useSettingsData.ts` — Settings loading/saving state (extracted from SettingsTab)
- `web/hooks/usePasswordChange.ts` — Password change state (extracted from SettingsTab)
- `web/hooks/useApiKeysManager.ts` — API key management state (extracted from SettingsTab)
- `web/hooks/useDashboardData.ts` — Dashboard data/operations state (extracted from DashboardView)
- `mcp/src/index.ts` — MCP server bootstrap (registers tools + prompts, stdio transport)
- `mcp/src/client.ts` — HTTP client for web app API (Bearer token auth, all data types)
- `mcp/src/tools/biomarkers.ts` — Unified `get-biomarkers` tool (supports slugs, category, include_history params)
- `mcp/src/tools/reports.ts` — `list-reports` tool (report metadata)
- `mcp/src/tools/registry.ts` — `search-registry` tool (biomarker definitions/clinical context)
- `mcp/src/prompts/index.ts` — 4 MCP prompts (structural workflow guidance, no interpretation)

## Dev Commands

```bash
cd web
npm run dev      # localhost:3000
npx tsc --noEmit # type-check

cd mcp
npm run build    # compile MCP server
npm start        # run MCP server (stdio)
```

## Conventions

- OpenRouter for all LLM calls (ZDR enabled). Default model: Gemini 2.5 Pro.
- Neon Postgres via Drizzle ORM (`DATABASE_URL` env var). All state is fully DB-backed.
- `rawName` = exact text from PDF, `metricName` = normalized clinical name.
- PDF highlighting uses row-based spatial matching, not substring search.
- MCP server returns raw factual data only — no sentiment/good/bad judgments. Flags (HIGH/LOW/NORMAL), direction (up/down/flat), goalDirection, and reference ranges are factual and stay. The consuming LLM interprets meaning.

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
