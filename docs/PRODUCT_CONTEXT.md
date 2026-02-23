# Product Context

## What This Is

A local web app for extracting structured biomarker data from lab report PDFs. Upload a PDF, an LLM extracts all biomarker results into structured JSON, then review and correct the results in a side-by-side UI with the original PDF.

Currently supports: Quest Diagnostics blood panels, Function Health reports, BodySpec DEXA scans.

## Architecture

```
Browser (localhost:3000)
├── Left pane: PDF viewer (react-pdf) with text-layer highlighting
├── Right pane: Editable results table grouped by category
└── API route → OpenRouter (Gemini 2.5 Pro default) → structured JSON
```

No database. All state in-memory. Export to JSON.

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

### LLM Extraction: Page Numbers Are Critical

Every extracted biomarker includes the 1-indexed page number where it appears. This enables click-to-source tracing in the UI. Page accuracy varies by model — Gemini 2.5 Pro is currently the most reliable.

## Future Plans

### Multi-File Support (V2)

Upload multiple health files per product/person. Track the same biomarkers over time:
- Timeline view: line charts showing biomarker values across multiple reports
- Automatic deduplication by metricName across files
- Date-based sorting using collectionDate from each report

### Database Persistence

Move from in-memory JSON to SQLite or Postgres:
- Store verified extractions permanently
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

The extraction prompt lives in `biomarker-extract/lib/prompt.ts`. Key rules it enforces:
- Extract each biomarker once (first occurrence only)
- Current results only (ignore historical/previous columns)
- Handle less-than values, qualitative results, categorical results
- Skip "SEE NOTE" entries
- Accurate page numbers for every biomarker
- Specific DEXA scan handling (regions, skip trend pages)
- Metric name normalization (rawName preserved separately)
