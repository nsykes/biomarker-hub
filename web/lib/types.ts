export interface ReportInfo {
  source: string;
  labName: string | null;
  collectionDate: string;
  reportType: "blood_panel" | "dexa_scan" | "other";
  patientName?: string;
}

export type BiomarkerFlag =
  | "NORMAL"
  | "LOW"
  | "HIGH"
  | "ABNORMAL"
  | "CRITICAL_LOW"
  | "CRITICAL_HIGH";

export interface Biomarker {
  id: string;
  category: string;
  metricName: string;
  rawName: string;
  value: number | null;
  valueText: string | null;
  valueModifier: "<" | ">" | null;
  unit: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  flag: BiomarkerFlag;
  page: number;
  region: string | null;
  canonicalSlug: string | null;
  isCalculated?: boolean;
}

export interface ExtractionResult {
  reportInfo: ReportInfo;
  biomarkers: Biomarker[];
}

export interface ExtractionMeta {
  model: string;
  tokensUsed: number | null;
  duration: number | null;
}

export interface ExtractionResponse {
  extraction: ExtractionResult;
  meta: ExtractionMeta;
}

export interface HighlightTarget {
  page: number;
  rawName: string;
  value: string | null;
  unit: string | null;
  region: string | null;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  default?: boolean;
}

export interface StoredFile {
  id: string;
  filename: string;
  addedAt: string;
  source: string | null;
  labName: string | null;
  collectionDate: string | null;
  reportType: string | null;
  biomarkers: Biomarker[];
  meta: ExtractionMeta;
  pdfSizeBytes: number | null;
}

export interface AppSettings {
  id: string;
  openRouterApiKey: string | null;
  defaultModel: string;
}

export type TabId = "files" | "biomarkers" | "dashboards" | "settings";

export interface DashboardSummary {
  id: string;
  name: string;
  biomarkerCount: number;
  updatedAt: string;
}

export interface DashboardItem {
  id: string;
  canonicalSlug: string;
  sortOrder: number;
}

export interface DashboardDetail {
  id: string;
  name: string;
  items: DashboardItem[];
}

export interface BiomarkerHistoryPoint {
  collectionDate: string | null;
  value: number | null;
  valueText: string | null;
  valueModifier: "<" | ">" | null;
  unit: string | null;
  flag: BiomarkerFlag;
  reportId: string;
  filename: string;
  labName: string | null;
  source: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  page: number | null;
  isCalculated?: boolean;
}

export interface ReferenceRange {
  rangeLow: number | null;
  rangeHigh: number | null;
  goalDirection: "below" | "above" | "within";
  unit: string | null;
}

export interface ReferenceRangeConflict {
  slug: string;
  metricName: string;
  stored: { low: number | null; high: number | null; unit: string | null };
  pdf: { low: number | null; high: number | null; unit: string | null };
}

export interface BiomarkerDetailData {
  slug: string;
  displayName: string;
  fullName: string;
  category: string;
  defaultUnit: string | null;
  summary?: string;
  history: BiomarkerHistoryPoint[];
  referenceRange: ReferenceRange | null;
}
