# Biomarker Project

Monorepo for biomarker extraction and health data tools.

## Structure

- `biomarker-extract/` — Next.js 15 app (App Router) for extracting biomarkers from lab report PDFs
- `docs/` — Product context, design decisions, and future plans

## Key Files

- `biomarker-extract/lib/prompt.ts` — LLM extraction prompt (critical — changes affect all extractions)
- `biomarker-extract/lib/highlight.ts` — PDF text highlighting (row-based matching algorithm)
- `biomarker-extract/lib/types.ts` — Shared TypeScript interfaces
- `biomarker-extract/app/api/extract/route.ts` — OpenRouter API route

## Dev Commands

```bash
cd biomarker-extract
npm run dev      # localhost:3000
npx tsc --noEmit # type-check
```

## Conventions

- OpenRouter for all LLM calls (ZDR enabled). Default model: Gemini 2.5 Pro.
- No database in V1 — all state is in-memory, export to JSON.
- `rawName` = exact text from PDF, `metricName` = normalized clinical name.
- PDF highlighting uses row-based spatial matching, not substring search.

## Keeping Docs Current

**You must proactively update these files as the project evolves:**

- **`docs/PRODUCT_CONTEXT.md`** — Update whenever architecture changes, new design decisions are made, features are added/removed, or future plans shift. This file should always reflect the current state of the product. Assume this needs updating on nearly every session.
- **`CLAUDE.md` (this file)** — Update when project structure changes (new dirs, key files added/removed), conventions change, or dev commands change.

Don't ask whether to update — just do it as part of completing the task. If a conversation reveals new context, decisions, or direction, capture it before finishing.

## Context

See `docs/PRODUCT_CONTEXT.md` for product vision, design decisions, and future plans.
