/**
 * HTTP client for calling the Biomarker Hub API routes.
 * Reads BIOMARKER_HUB_API_KEY and BIOMARKER_HUB_URL from environment.
 */

const DEFAULT_BASE_URL = "https://biomarker-hub.vercel.app";

export interface BiomarkerSummary {
  slug: string;
  displayName: string;
  fullName: string;
  category: string;
  defaultUnit: string | null;
}

export interface TrendInfo {
  latestValue: number;
  latestUnit: string | null;
  latestFlag: string;
  latestDate: string;
  direction: "up" | "down" | "flat" | null;
  sentiment: "good" | "bad" | "neutral";
}

export interface HistoryPoint {
  collectionDate: string | null;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  flag: string;
  reportId: string;
  source: string | null;
  labName: string | null;
  isCalculated: boolean;
}

export interface ReferenceRange {
  rangeLow: number | null;
  rangeHigh: number | null;
  goalDirection: string;
  unit: string | null;
}

export interface BiomarkerDetail extends BiomarkerSummary {
  summary: string | null;
  history: HistoryPoint[];
  referenceRange: ReferenceRange | null;
  trend: TrendInfo | null;
}

export interface ReportSummary {
  id: string;
  filename: string;
  source: string | null;
  labName: string | null;
  collectionDate: string | null;
  reportType: string | null;
  addedAt: string;
  biomarkerCount: number;
}

export interface RegistryEntry {
  slug: string;
  displayName: string;
  fullName: string;
  category: string;
  defaultUnit: string | null;
  summary: string | null;
  specimenType: string | null;
}

export interface StoredRange {
  slug: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  goalDirection: string;
  unit: string | null;
}

export class BiomarkerHubClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BIOMARKER_HUB_API_KEY ?? "";
    this.baseUrl = (
      process.env.BIOMARKER_HUB_URL ?? DEFAULT_BASE_URL
    ).replace(/\/$/, "");

    if (!this.apiKey) {
      throw new Error(
        "BIOMARKER_HUB_API_KEY is required. Generate one at Settings > API Keys in the web app."
      );
    }
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async listBiomarkers(
    category?: string,
    reportId?: string
  ): Promise<{ biomarkers: BiomarkerSummary[] }> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (reportId) params.set("report_id", reportId);
    const qs = params.toString();
    return this.fetch(`/api/v1/biomarkers${qs ? `?${qs}` : ""}`);
  }

  async getBiomarkerDetail(slug: string): Promise<BiomarkerDetail> {
    return this.fetch(`/api/v1/biomarkers/${encodeURIComponent(slug)}`);
  }

  async getBiomarkerBatch(
    slugs: string[],
    reportId?: string
  ): Promise<{ biomarkers: BiomarkerDetail[] }> {
    const params = new URLSearchParams({ slugs: slugs.join(",") });
    if (reportId) params.set("report_id", reportId);
    return this.fetch(`/api/v1/biomarkers/batch?${params}`);
  }

  async listReports(): Promise<{ reports: ReportSummary[] }> {
    return this.fetch("/api/v1/reports");
  }

  async getRegistry(
    search?: string,
    category?: string
  ): Promise<{ registry: RegistryEntry[] }> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const qs = params.toString();
    return this.fetch(`/api/v1/registry${qs ? `?${qs}` : ""}`);
  }

  async getReferenceRanges(): Promise<{ ranges: StoredRange[] }> {
    return this.fetch("/api/v1/reference-ranges");
  }
}
