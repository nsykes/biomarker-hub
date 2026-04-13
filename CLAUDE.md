# Biomarker Project

Next.js 16 app for biomarker extraction and health data tracking, with a remote MCP server for AI assistant integration.

## Structure

- `web/` — Next.js 16 app (App Router)

### MCP Server (embedded in web app)
- `web/app/api/mcp/[transport]/route.ts` — Streamable HTTP MCP endpoint (3 tools + 4 prompts, calls DB directly). Uses `mcp-handler` package.
- `web/lib/mcp/` — MCP helpers: `auth.ts` (OAuth token validation), `format.ts` (toCompact/toFull formatters), `prompts.ts` (prompt registration), `url.ts` (base URL helper)
- `web/app/api/oauth/` — OAuth 2.1 endpoints: `register/` (DCR), `authorize/` (code generation), `token/` (token exchange)
- `web/app/oauth/authorize/page.tsx` — User consent page for OAuth flow
- `web/app/.well-known/` — OAuth metadata: `oauth-protected-resource/`, `oauth-authorization-server/`
- Auth: dual-mode — accepts OAuth tokens (from Claude.ai flow) or existing `bh_` API keys as Bearer tokens
- Design philosophy: return raw factual data (values, flags, directions, reference ranges) — no subjective interpretation. Let the consuming LLM decide what matters.

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
- `web/lib/db/actions/` — Server action sub-modules (auth, reports, settings, biomarkers, account, dashboards, goals, api-keys, doctor-shares)
- `web/lib/db/queries/biomarkers.ts` — Shared query functions (accept userId param, used by both server actions and API routes)
- `web/lib/db/result.ts` — `SafeResult<T>` and `ActionResult` types for error-as-data server actions
- `web/lib/db/helpers.ts` — `firstOrNull`/`firstOrThrow` DB query helpers
- `web/lib/api-auth.ts` — API key authentication helper for v1 API routes
- `web/app/api/v1/` — External API routes (Bearer token auth via API keys) for MCP server and integrations
- `web/app/share/[token]/page.tsx` — Public doctor share page (password-protected)
- `web/app/api/share/[token]/pdf/[reportId]/route.ts` — PDF retrieval for authenticated share requests
- `web/lib/mcp/auth.ts` — OAuth access token validation (SHA-256 hash lookup in oauthTokens table)
- `web/lib/mcp/format.ts` — MCP response formatters (toCompact/toFull, works with web app types)
- `web/lib/mcp/prompts.ts` — MCP prompt registration (shared by remote MCP route)
- `web/lib/mcp/url.ts` — App base URL helper (NEXT_PUBLIC_APP_URL → VERCEL_PROJECT_PRODUCTION_URL → localhost)
- `web/app/api/mcp/[transport]/route.ts` — MCP route handler (3 tools: get-biomarkers, list-reports, search-registry + 4 prompts)
- `web/components/BiomarkerDetailPage.tsx` — BiomarkerDetailView (inline, self-fetching) + BiomarkerDetailPage (standalone wrapper)
- `web/components/biomarker-detail/` — Detail subcomponents (HistoryChart, HistoryTable, ReferenceRangeSection, helpers)
- `web/components/BiomarkerCombobox.tsx` — Registry-backed biomarker search/select for adding biomarkers after extraction
- `web/components/ReportInfoField.tsx` — Inline-editable field for report info (date, source, lab)
- `web/components/DatePickerInput.tsx` — Custom calendar popover date picker (no external deps), used in FilesTab filters
- `web/components/PdfPreviewModal.tsx` — Modal for previewing source PDF from history table rows
- `web/components/RangeConflictModal.tsx` — Modal for resolving reference range conflicts between PDF and stored ranges
- `web/components/ShareView.tsx` — Password auth + shared biomarker browser for doctor share pages
- `web/components/SharedPdfPreviewModal.tsx` — PDF preview modal for share pages
- `web/components/DeleteAccountModal.tsx` — Confirmation modal for account deletion (type "DELETE" to confirm)
- `web/components/ThemeToggle.tsx` — Light/dark/system theme toggle (cycles light→dark→system)
- `web/components/UserMenu.tsx` — Header user dropdown (name, email, sign-out) using authClient.useSession()
- `web/components/SettingsTab.tsx` — Settings page layout, composes section components from `settings/`
- `web/components/settings/` — Settings section components (ApiKeySection, ModelSection, PrivacySection, ExportSection, ApiKeysSection, PasswordSection, DeleteAccountSection, DoctorSharesSection)
- `web/components/GoalsTab.tsx` — Goals tab (flat grid of goal cards with create/edit)
- `web/components/GoalChartCard.tsx` — Goal card with history chart + goal line + target delta
- `web/components/goals/GoalGrid.tsx` — Drag-to-reorder grid for goal cards
- `web/components/CreateGoalModal.tsx` — Modal for creating/editing goals (biomarker + target value)
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
- `web/lib/db/actions/goals.ts` — Goal CRUD + reorder + chart data server actions
- `web/lib/db/actions/doctor-shares.ts` — Doctor share CRUD server actions
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
- `web/hooks/useGoalData.ts` — Goal data/operations state (load, create, update, delete, reorder)
- `web/hooks/useDoctorShares.ts` — Doctor share management state (extracted from SettingsTab)

## Dev Commands

```bash
cd web
npm run dev      # localhost:3000
npx tsc --noEmit # type-check
```

## Conventions

- OpenRouter for all LLM calls (ZDR enabled). Default model: Gemini 2.5 Pro.
- Neon Postgres via Drizzle ORM (`DATABASE_URL` env var). All state is fully DB-backed.
- **CRITICAL — Neon has TWO orgs.** The production database is in the **Vercel-managed org** (project name: `biomarker-hub`). Do NOT use `buki-project` — it is not connected to the app. When running `drizzle-kit push` or any schema changes, use the connection string from the Vercel-managed project. Infrastructure IDs are stored in Claude memory.
- `rawName` = exact text from PDF, `metricName` = normalized clinical name.
- PDF highlighting uses row-based spatial matching, not substring search.
- MCP server returns raw factual data only — no sentiment/good/bad judgments. Flags (HIGH/LOW/NORMAL), direction (up/down/flat), goalDirection, and reference ranges are factual and stay. The consuming LLM interprets meaning.
- MCP transport: Streamable HTTP (`web/app/api/mcp/`) for remote access (Claude.ai web/mobile, any MCP client). Endpoint: `https://biomarker-hub.vercel.app/api/mcp/mcp`
- MCP auth: OAuth 2.1 with DCR for Claude.ai, plus `bh_` API key fallback. OAuth tables: `oauthClients`, `oauthCodes`, `oauthTokens` (all in main DB).
- Next.js 16 Turbopack quirk: `Response.json()` and `NextResponse.json()` silently fail in async route handlers. Use `new Response(JSON.stringify(...))` instead. All OAuth routes use this pattern.

## Keeping Docs Current

- **`CLAUDE.md` (this file)** — Update when project structure changes (new dirs, key files added/removed), conventions change, or dev commands change. Never ask whether to update — just do it.
- **Infrastructure IDs and project context** — Stored in Claude memory (not in repo). Update memory when infrastructure changes or new decisions are made.

**NEVER store personal health information (PHI), real biomarker values, patient names, dates of birth, or any real health data in any file in this repo.** This includes `CLAUDE.md`, comments in code, test fixtures, etc. The repo is public on GitHub. Use fake/placeholder data for examples.
