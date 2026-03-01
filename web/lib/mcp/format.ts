import type { BiomarkerDetailData, BiomarkerHistoryPoint } from "@/lib/types";
import type { TrendInfo } from "@/lib/trend";

export interface CompactBiomarker {
  slug: string;
  name: string;
  category: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  date: string | null;
  flag: string | null;
  direction: "up" | "down" | "flat" | null;
  referenceRange: {
    low: number | null;
    high: number | null;
    goalDirection: string;
    unit: string | null;
  } | null;
}

export interface FullBiomarker extends CompactBiomarker {
  fullName: string;
  summary: string | null;
  history: {
    date: string | null;
    value: number | null;
    valueText?: string | null;
    unit: string | null;
    flag: string;
    reportId: string;
    lab: string | null;
    isCalculated: boolean;
  }[];
}

export function toCompact(
  b: BiomarkerDetailData,
  trend: TrendInfo | null
): CompactBiomarker {
  const latest =
    b.history.length > 0 ? b.history[b.history.length - 1] : null;
  return {
    slug: b.slug,
    name: b.displayName,
    category: b.category,
    value: trend?.latestValue ?? null,
    valueText: latest?.valueText ?? null,
    unit: trend?.latestUnit ?? b.defaultUnit,
    date: trend?.latestDate ?? latest?.collectionDate ?? null,
    flag: trend?.latestFlag ?? latest?.flag ?? null,
    direction: trend?.direction ?? null,
    referenceRange: b.referenceRange
      ? {
          low: b.referenceRange.rangeLow,
          high: b.referenceRange.rangeHigh,
          goalDirection: b.referenceRange.goalDirection,
          unit: b.referenceRange.unit,
        }
      : null,
  };
}

export function toFull(
  b: BiomarkerDetailData,
  trend: TrendInfo | null
): FullBiomarker {
  return {
    ...toCompact(b, trend),
    fullName: b.fullName,
    summary: b.summary ?? null,
    history: b.history.map((h) => ({
      date: h.collectionDate,
      value: h.value,
      ...(h.valueText != null ? { valueText: h.valueText } : {}),
      unit: h.unit,
      flag: h.flag,
      reportId: h.reportId,
      lab: h.labName,
      isCalculated: h.isCalculated ?? false,
    })),
  };
}
