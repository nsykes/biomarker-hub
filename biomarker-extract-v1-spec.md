# Biomarker Extract — V1 Spec

> **What this is:** A local web app for extracting biomarker data from lab report PDFs with a side-by-side verification UI. Upload a PDF, send it to an LLM, review and correct the extracted results against the original document.

> **What this is NOT:** No database, no trend tracking, no MCP server, no deployment. V1 is purely extract → verify → edit → export JSON. Get the extraction loop right first.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL (localhost:3000)                     │
│                                                              │
│  ┌────────────────────────────┬───────────────────────────┐  │
│  │                            │                           │  │
│  │     PDF Viewer (left)      │   Extracted Results       │  │
│  │     - react-pdf/pdf.js     │   - Editable table        │  │
│  │     - text layer enabled   │   - Click row → scroll    │  │
│  │     - highlight overlays   │     PDF to source page    │  │
│  │                            │   - Edit any field inline │  │
│  │                            │   - Export to JSON        │  │
│  │                            │                           │  │
│  └────────────────────────────┴───────────────────────────┘  │
│                              │                                │
│                    API Route: /api/extract                    │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │ HTTPS (OpenRouter)
                               ▼
                    ┌──────────────────────┐
                    │  OpenRouter API       │
                    │  (ZDR enabled)        │
                    │                       │
                    │  Default: Gemini 2.5  │
                    │  Swappable to Claude, │
                    │  GPT-4o, etc.         │
                    └──────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 15** (App Router) | Full-stack React, API routes, runs locally |
| PDF Viewer | **react-pdf** (pdf.js wrapper) | Renders PDFs in browser, exposes text layer for highlighting |
| LLM API | **OpenRouter** | Single API, swap models freely, ZDR support |
| Styling | **Tailwind CSS** | Fast UI development |
| State | **React state (useState/useReducer)** | No database — all state lives in memory during session |
| Export | **JSON file download** | Save verified results locally |

### Setup

```bash
npx create-next-app@latest biomarker-extract --typescript --tailwind --app
cd biomarker-extract
npm install react-pdf pdfjs-dist
```

Environment:
```env
# .env.local
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-2.5-pro   # swappable
```

---

## 2. User Flow

1. **Upload PDF** — Drag-and-drop or file picker. PDF loads in the left pane.
2. **Extract** — Click "Extract Biomarkers". PDF is sent to OpenRouter → LLM returns structured JSON with page numbers.
3. **Review** — Results appear in the right pane as an editable table. Each row shows the biomarker name, value, unit, reference range, flag, and source page.
4. **Trace** — Click any row → left pane scrolls to that page. If the extracted value's text is found on that page, it gets highlighted in the PDF.
5. **Edit** — Click any cell to edit inline. Fix wrong values, names, units, flags.
6. **Export** — Click "Export JSON" to download the verified results.

---

## 3. UI Layout

### 3a. Split Pane

Full-viewport split pane, resizable divider. Default 50/50.

**Left pane: PDF Viewer**
- Rendered via react-pdf with text layer enabled (`renderTextLayer={true}`)
- Page navigation (prev/next, page number input, total pages)
- Zoom controls
- Active highlights: when a result row is selected, the corresponding text on the PDF page is highlighted with a colored overlay
- Sticky toolbar at top: filename, page controls, zoom

**Right pane: Results Panel**
- **Header bar:** Model selector dropdown, "Extract" button (with loading spinner), "Export JSON" button
- **Model selector:** Dropdown populated from a config list. Default: `google/gemini-2.5-pro`. Also offer: `anthropic/claude-sonnet-4`, `openai/gpt-4o`. User can type a custom model string.
- **Results table** (appears after extraction):
  - Columns: Category | Metric Name | Value | Unit | Reference Range | Flag | Page
  - Grouped by category (collapsible sections)
  - Each cell is editable on click (inline edit, press Enter to save, Escape to cancel)
  - Row click → scrolls PDF to that page
  - Flag column: color-coded pill (green=NORMAL, red=HIGH, blue=LOW, yellow=ABNORMAL)
  - Page column: clickable page number link
- **Status bar:** Extraction status, token count, model used, duration
- **Empty state:** "Upload a PDF and click Extract to begin"

### 3b. Header

Minimal top bar:
- App name: "Biomarker Extract"
- Upload button (or drag-drop zone that covers the left pane when empty)

---

## 4. Extraction Schema

The LLM returns this JSON structure. This is what gets displayed in the results table and exported.

```typescript
// Types for extraction output
interface ExtractionResult {
  reportInfo: {
    source: string;          // "Function Health", "Goodlabs", "BodySpec"
    labName: string | null;  // "Quest Diagnostics", null for DEXA
    collectionDate: string;  // ISO date: "2025-12-02"
    reportType: "blood_panel" | "dexa_scan" | "other";
    patientName?: string;    // Extracted but can be stripped before sending to LLM
  };
  biomarkers: Biomarker[];
}

interface Biomarker {
  id: string;                         // Generated UUID for React keys + editing
  category: string;                   // "Heart", "Metabolic", "CBC", "Body Composition", "Bone", etc.
  metricName: string;                 // Normalized: "LDL Cholesterol", "Fasting Glucose"
  rawName: string;                    // As it appears in PDF: "LDL-CHOLESTEROL", "GLUCOSE"
  value: number | null;               // Numeric value, null for categorical/qualitative
  valueText: string | null;           // For non-numeric: "B", "NEGATIVE", "<0.2"
  valueModifier: "<" | ">" | null;    // For less-than/greater-than values
  unit: string | null;                // "mg/dL", "%", "lbs", null for ratios
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  flag: "NORMAL" | "LOW" | "HIGH" | "ABNORMAL" | "CRITICAL_LOW" | "CRITICAL_HIGH";
  page: number;                       // 1-indexed page number where this value appears
  region: string | null;              // DEXA only: "Arms", "Legs", "Trunk", "Android", etc.
}
```

---

## 5. LLM Extraction

### 5a. API Route: `/api/extract`

```typescript
// app/api/extract/route.ts
// Accepts: multipart/form-data with PDF file + model selection
// Returns: ExtractionResult JSON

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('pdf') as File;
  const model = formData.get('model') as string || process.env.OPENROUTER_MODEL;

  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Biomarker Extract',
    },
    body: JSON.stringify({
      model,
      // ZDR enforced per-request
      provider: {
        data_collection: 'deny',
        preferences: { zdr: true }
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: EXTRACTION_PROMPT
            },
            {
              // Gemini and Claude both accept base64 PDF via document type
              // OpenRouter normalizes this across providers
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 16000,
    })
  });

  const data = await response.json();
  const extraction = JSON.parse(data.choices[0].message.content);

  // Add UUIDs to each biomarker for React keys
  extraction.biomarkers = extraction.biomarkers.map((b: Biomarker) => ({
    ...b,
    id: crypto.randomUUID()
  }));

  return Response.json({
    extraction,
    meta: {
      model: data.model,
      tokensUsed: data.usage?.total_tokens,
      duration: data.usage?.total_time || null,
    }
  });
}
```

### 5b. Extraction Prompt

This is the critical piece. The prompt must handle all three lab formats.

```typescript
const EXTRACTION_PROMPT = `You are a medical lab report parser. Extract ALL biomarker results from this PDF into structured JSON.

## Output Format

Return a JSON object with this exact structure:
{
  "reportInfo": {
    "source": "string - ordering service name (e.g. 'Function Health', 'Goodlabs', 'BodySpec')",
    "labName": "string or null - lab that ran the tests (e.g. 'Quest Diagnostics')",
    "collectionDate": "string - ISO date YYYY-MM-DD",
    "reportType": "blood_panel | dexa_scan | other"
  },
  "biomarkers": [
    {
      "category": "string",
      "metricName": "string - normalized name",
      "rawName": "string - exactly as printed in PDF",
      "value": "number or null",
      "valueText": "string or null - for non-numeric results",
      "valueModifier": "< or > or null",
      "unit": "string or null",
      "referenceRangeLow": "number or null",
      "referenceRangeHigh": "number or null",
      "flag": "NORMAL | LOW | HIGH | ABNORMAL | CRITICAL_LOW | CRITICAL_HIGH",
      "page": "number - 1-indexed page where this value appears",
      "region": "string or null - body region for DEXA scans"
    }
  ]
}

## Critical Rules

1. **Extract each biomarker ONCE.** If the same metric appears multiple times (appendix, summary table, Cardio IQ table), use the FIRST occurrence only.

2. **Only extract CURRENT results.** Ignore "Previous Result" columns and historical data. For DEXA scans with multiple dates, extract only the most recent scan.

3. **Less-than values:** "<0.2" → value: 0.2, valueModifier: "<", valueText: "<0.2"

4. **Qualitative results:** "NEGATIVE", "NONE SEEN", "YELLOW", "CLEAR" → value: null, valueText: "NEGATIVE"

5. **Categorical results:** LDL Pattern "B" → value: null, valueText: "B"

6. **Skip "SEE NOTE" entries** — if a result says "SEE NOTE" with no numeric value, skip it entirely.

7. **Page numbers are critical.** For EVERY biomarker, include the 1-indexed page number where the value appears in the PDF. This is used for source tracing.

8. **Flag mapping:** Use the flag from the report. "H" = HIGH, "L" = LOW. If no flag is shown, set NORMAL. If a value is outside the reference range but has no flag, determine the flag from the range.

9. **Reference ranges:** 
   - "65-99" → referenceRangeLow: 65, referenceRangeHigh: 99
   - ">25" → referenceRangeLow: 25, referenceRangeHigh: null  
   - "<200" → referenceRangeLow: null, referenceRangeHigh: 200
   - ">=5.5" optimal → referenceRangeLow: 5.5, referenceRangeHigh: null
   - No range shown → both null

10. **Categories:** Group into: Heart, Metabolic, Kidney, Liver, Electrolytes, Proteins, CBC, Inflammation, Thyroid, Endocrinology, Fatty Acids, Urinalysis, Prostate, Body Composition, Bone, Muscle Balance

11. **DEXA scans:** Use region field for body-region-specific metrics. Examples:
    - "Arms Fat Percentage" with region: "Arms"
    - "Right Arm Lean Mass" with region: "Right Arm"
    - Total body metrics: region: null
    - VAT Mass and VAT Volume are separate metrics
    - Skip marketing/cover pages
    - Skip regional trend report pages (pages with "Change vs. Baseline" tables)

12. **Metric name normalization:** Use common clinical names:
    - "CHOLESTEROL, TOTAL" → "Total Cholesterol"
    - "UREA NITROGEN (BUN)" → "Blood Urea Nitrogen"  
    - "HEMOGLOBIN A1c" → "Hemoglobin A1c"
    - "HS CRP" → "High-Sensitivity C-Reactive Protein"
    - Keep the rawName field as the exact text from the PDF

Extract every result. Do not summarize or skip any biomarker that has a value.`;
```

### 5c. Model Configuration

```typescript
// lib/models.ts
export const AVAILABLE_MODELS = [
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Best for PDF/OCR extraction',
    default: true,
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Strong structured output',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'Good multimodal baseline',
  },
] as const;
```

---

## 6. PDF Viewer + Highlighting

### 6a. Text Layer Highlighting

react-pdf renders a transparent text layer over the PDF canvas. This text layer contains actual DOM elements with the text content and positions matching the PDF layout. We can search this layer to highlight extracted values.

```typescript
// Highlighting approach:
// 1. LLM returns page number for each biomarker
// 2. When user clicks a result row, scroll PDF to that page
// 3. Search the text layer on that page for the rawName and value
// 4. Add highlight overlay divs positioned over matching text spans

interface HighlightTarget {
  page: number;
  searchTerms: string[];  // [rawName, value string] to find on the page
}

// After react-pdf renders a page with textLayer enabled,
// query the text layer spans:
function highlightOnPage(pageElement: HTMLElement, terms: string[]) {
  const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return;

  const spans = textLayer.querySelectorAll('span');
  spans.forEach(span => {
    const text = span.textContent || '';
    if (terms.some(term => text.includes(term))) {
      // Add highlight overlay positioned relative to the span
      const rect = span.getBoundingClientRect();
      // Create overlay div with yellow background, absolute positioning
    }
  });
}
```

### 6b. Fallback: Page-Level Scrolling

If text-layer search fails (scanned PDFs, unusual text encoding), fall back to page-level scroll only. The page number in the results table is still clickable and scrolls the PDF viewer to the correct page. The user can visually verify without highlighting.

---

## 7. Inline Editing

Every cell in the results table is editable.

```typescript
// Editing state management
interface EditState {
  biomarkerId: string;
  field: keyof Biomarker;
  originalValue: any;
  currentValue: any;
}

// On cell click: enter edit mode (show input)
// On Enter: save, exit edit mode
// On Escape: revert, exit edit mode
// On Tab: save current, move to next cell

// For flag field: dropdown selector instead of text input
// For value field: numeric input with step="any"
// For page field: numeric input (integer)
// For all others: text input
```

Editing is purely in-memory. No autosave, no database. Changes are reflected in the export.

---

## 8. Export

### JSON Export

```typescript
function exportResults(extraction: ExtractionResult) {
  const json = JSON.stringify(extraction, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `biomarkers-${extraction.reportInfo.collectionDate}-${extraction.reportInfo.source}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

The exported JSON matches the ExtractionResult schema exactly, with any inline edits applied. This file can later be imported into a database, trend tracker, or MCP server in a future version.

---

## 9. File Structure

```
biomarker-extract/
├── app/
│   ├── layout.tsx              # Root layout with Tailwind
│   ├── page.tsx                # Main page — split pane with PDF viewer + results
│   └── api/
│       └── extract/
│           └── route.ts        # OpenRouter API call
├── components/
│   ├── PdfViewer.tsx           # react-pdf wrapper with text layer + highlighting
│   ├── ResultsPanel.tsx        # Extraction results table with inline editing
│   ├── BiomarkerRow.tsx        # Single editable row
│   ├── ModelSelector.tsx       # Model dropdown
│   ├── UploadZone.tsx          # Drag-and-drop PDF upload
│   ├── FlagBadge.tsx           # Color-coded flag pill
│   └── SplitPane.tsx           # Resizable split pane container
├── lib/
│   ├── models.ts               # Available model definitions
│   ├── prompt.ts               # Extraction prompt
│   ├── types.ts                # TypeScript interfaces
│   └── highlight.ts            # PDF text layer search + highlight logic
├── .env.local                  # OpenRouter API key + default model
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 10. Edge Cases & Known Challenges

### Extraction Challenges (from PDF validation)

These were validated against the three real PDFs and documented in the extraction prompt:

- **Function Health appendix duplication** — 17 pages, pages 10-17 repeat all data. Prompt instructs: extract each biomarker once, first occurrence only.
- **Cardio IQ summary table** — Color-coded grid in Function Health appendix duplicates lipid data. Prompt instructs: skip tables with "Cardio IQ" header.
- **Less-than values** — hs-CRP `<0.2`, Rheumatoid Factor `<10`. Stored with valueModifier.
- **SEE NOTE entries** — BUN/Creatinine Ratio sometimes has no value. Skipped.
- **Qualitative urinalysis** — NEGATIVE, NONE SEEN, etc. Stored in valueText.
- **DEXA historical data** — 3 scan dates in one report. Only extract most recent.
- **DEXA regional trend pages** — Pages 4-7 duplicate summary data. Skip.
- **DEXA cover page** — Marketing content. Skip.

### Highlighting Challenges

- **Scanned PDFs:** If the PDF is image-based (no text layer), highlighting won't work. Page-level scroll still works.
- **Text encoding quirks:** Some PDFs encode characters oddly (ligatures, font substitution). The text layer may not contain the literal string "GLUCOSE". Fuzzy matching may be needed.
- **Multi-line values:** A biomarker name might span two lines. Search for both the full name and significant substrings.

### Model Differences

- **Gemini 2.5 Pro:** Best at reading complex table layouts. May occasionally hallucinate values not present in the PDF. Strong page-number accuracy.
- **Claude Sonnet:** Very reliable structured output. May struggle with dense multi-column layouts. Good at following complex extraction rules.
- **GPT-4o:** Solid baseline. Less accurate on unusual table formats.

Run the same PDF through multiple models and compare. The editable UI lets you quickly identify which model makes fewer errors on your specific lab formats.

---

## 11. Future (Post-V1)

These are explicitly out of scope for V1 but inform the architecture:

- **Database persistence** — Save verified results to SQLite/Postgres
- **Trend charts** — Line charts for biomarker values over time
- **MCP server** — Expose biomarker data to Claude/ChatGPT
- **Batch processing** — Upload multiple PDFs at once
- **Diff view** — Compare two extractions from different models side-by-side
- **PII stripping** — Remove name/DOB from PDF before sending to LLM
- **Custom extraction prompts** — Per-lab-format prompt overrides
