<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="web/public/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="web/public/logo.svg" />
    <img src="web/public/logo.svg" alt="Biomarker Hub" width="280" />
  </picture>
</p>

<p align="center">
  Track your health biomarkers over time. Upload lab PDFs, extract results with AI, and visualize trends.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel" alt="Vercel" />
</p>

---

## What is Biomarker Hub?

Biomarker Hub is a privacy-first web app for tracking health lab results over time. Upload a lab report PDF, and an LLM extracts every biomarker into structured data — values, units, reference ranges, flags, and page numbers. Review the extraction side-by-side with the original PDF, correct any errors, then save. As you upload more reports, the app builds trend charts for each biomarker so you can see how your health markers change over time.

Currently supports blood panels (Quest Diagnostics, Function Health, and similar formats) and DEXA body composition scans (BodySpec).

## Features

- **AI-powered extraction** — Upload a lab report PDF and an LLM extracts all biomarkers into structured data (value, unit, reference range, flag, page number)
- **Side-by-side review** — Review extracted results next to the original PDF with click-to-highlight source tracing
- **PDF text highlighting** — Row-based spatial matching algorithm highlights the exact source line for each biomarker in the PDF
- **181 biomarker registry** — Canonical registry spanning 22 categories (Heart, CBC, Metabolic, Thyroid, Body Composition, Bone, and more) with aliases for cross-lab name matching
- **Trend charts** — Time-proportional line charts for each biomarker with color-coded data points and reference range zones
- **Custom reference ranges** — Global reference ranges auto-populated from lab data, with conflict resolution when labs disagree and manual editing
- **Unit normalization** — Automatic display-time conversion across labs (e.g., mg/dL ↔ mmol/L) using a deterministic conversion table based on molecular weights
- **Unknown biomarker remapping** — Unmatched extractions can be manually mapped to the canonical registry during review
- **Large PDF chunking** — PDFs over 8 pages are split into parallel chunks for extraction, with results merged and deduplicated
- **Add and delete biomarkers** — Correct extraction errors by adding from the registry or removing incorrect entries (with undo)
- **CSV export** — Download all biomarker data as a CSV file from Settings
- **Dashboards** — Named collections of biomarker charts with 7 pre-made templates, drag-to-reorder, trend indicators, and multi-metric overlay charts
- **Derivative biomarkers** — 77 auto-calculated biomarkers (ratios, sums, percentages) computed from extracted components when not present in the PDF
- **Dark mode** — Full light/dark/system theme support with CSS custom properties
- **Google OAuth** — Authentication via Neon Auth with per-user data isolation
- **BYOK model** — Each user provides their own OpenRouter API key — no server-side key, no shared costs
- **MCP server** — Stdio-based Model Context Protocol server for exposing biomarker data to AI assistants (Claude Desktop, Claude Code)
- **API keys** — Generate and manage API keys for external integrations (MCP server, custom tools)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database | [Neon Postgres](https://neon.tech/) via [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Neon Auth](https://neon.tech/docs/guides/neon-auth) (Google OAuth) |
| LLM | [OpenRouter](https://openrouter.ai/) (default: Gemini 2.5 Pro) |
| PDF viewing | [react-pdf](https://github.com/wojtekmaj/react-pdf) |
| PDF splitting | [pdf-lib](https://pdf-lib.js.org/) |
| Charts | [Recharts](https://recharts.org/) |
| Drag & drop | [dnd-kit](https://dndkit.com/) |
| Deployment | [Vercel](https://vercel.com/) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech/) Postgres database with [Neon Auth](https://neon.tech/docs/guides/neon-auth) enabled (Google OAuth provider configured)
- An [OpenRouter](https://openrouter.ai/) API key (each user enters their own in the app's Settings)

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp web/.env.example web/.env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEON_AUTH_BASE_URL` | From Neon dashboard → Auth tab |
| `NEON_AUTH_COOKIE_SECRET` | 32+ character secret (`openssl rand -base64 32`) |

> **Note:** OpenRouter API keys are entered per-user in the app's Settings page — there is no server-side LLM key.

### Install & Run

```bash
cd web
npm install
npx drizzle-kit push    # apply schema to your Neon database
npm run dev              # http://localhost:3000
```

## Project Structure

```
biomarker-hub/
├── web/                          # Next.js app
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract/          # LLM extraction endpoint
│   │   │   ├── reports/[id]/pdf/ # PDF upload & retrieval
│   │   │   ├── account/export/   # CSV export endpoint
│   │   │   └── v1/               # External API (Bearer token auth)
│   │   ├── auth/                 # Sign-in / sign-up pages
│   │   └── biomarkers/[slug]/    # Biomarker detail pages
│   ├── components/
│   │   ├── biomarker-detail/     # Chart, table, range subcomponents
│   │   ├── AppShell.tsx          # App layout with tabs
│   │   ├── ExtractionView.tsx    # Main extraction UI
│   │   ├── PdfViewer.tsx         # PDF renderer with highlighting
│   │   └── DashboardView.tsx     # Dashboard detail with chart grid
│   ├── hooks/
│   │   ├── useNavigationState.ts # Browser history + navigation state
│   │   ├── useChartColors.ts     # CSS color vars for Recharts
│   │   └── useCategoryCollapse.ts # Collapsible category sections
│   └── lib/
│       ├── db/
│       │   ├── schema.ts         # Drizzle schema (8 tables)
│       │   ├── queries/          # Shared query functions
│       │   └── actions/          # Server action modules
│       ├── prompt.ts             # LLM extraction prompt
│       ├── highlight.ts          # PDF row-based highlighting
│       ├── biomarker-registry.ts # Canonical biomarker registry
│       ├── unit-conversions.ts   # Cross-lab unit normalization
│       ├── derivative-calc.ts    # Auto-calculated biomarkers
│       ├── trend.ts              # Trend computation for dashboards
│       ├── types.ts              # Shared TypeScript interfaces
│       └── constants.ts          # Shared magic values
├── mcp/                          # MCP server (stdio)
│   └── src/                      # TypeScript source
└── docs/
    └── PROJECT_CONTEXT.md        # Architecture & design decisions
```

## How It Works

1. **Upload** — User uploads a lab report PDF
2. **Chunk** — Large PDFs (>8 pages) are split into 6-page chunks using pdf-lib
3. **Extract** — Each chunk is sent to an LLM via OpenRouter for structured extraction (parallel for chunked PDFs)
4. **Match** — Extracted biomarkers are matched against the canonical registry using name + alias lookup, with region-aware fallback for DEXA scans
5. **Dedup** — Duplicate biomarkers (summary/appendix pages repeating earlier results) are removed, keeping the first occurrence
6. **Review** — Results are displayed side-by-side with the PDF for manual review, correction, remapping, and add/delete
7. **Reconcile** — Reference ranges from the PDF are compared against stored ranges, with conflict resolution when they differ
8. **Save** — Verified results are persisted to Postgres (report metadata + individual biomarker rows + PDF binary)
9. **Track** — Biomarker detail pages show trend charts and history tables across all uploaded reports

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth user with health fields (date of birth, sex) |
| `reports` | Lab report metadata + stored PDF binary |
| `biomarker_results` | Individual biomarker values linked to reports |
| `reference_ranges` | Global per-biomarker reference ranges (auto-populated from lab data) |
| `settings` | Per-user settings (OpenRouter API key, default model) |
| `dashboards` | User-created named collections of biomarker charts |
| `dashboard_items` | Biomarker membership and ordering within dashboards |
| `api_keys` | Per-user API keys for external access (MCP server, integrations) |

## Deployment

The app is designed for Vercel:

1. Connect your GitHub repo to a Vercel project
2. Set **Root Directory** to `web` (this is a monorepo)
3. Framework preset will auto-detect as Next.js
4. Add the environment variables from the table above to your Vercel project settings
5. Deploy

## Contributing

This is an early-stage project. Issues and pull requests are welcome. There is no test suite yet — contributions that add testing infrastructure would be especially appreciated.

```bash
cd web
npx tsc --noEmit  # type-check before submitting
```

## License

[MIT](LICENSE)

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) — unified LLM API access
- [Neon](https://neon.tech/) — serverless Postgres + auth
- [Vercel](https://vercel.com/) — hosting and deployment
