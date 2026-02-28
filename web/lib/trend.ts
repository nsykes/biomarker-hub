import { BiomarkerHistoryPoint, ReferenceRange } from "@/lib/types";
import { convertToCanonical } from "@/lib/unit-conversions";

export type TrendDirection = "up" | "down" | "flat";
export type TrendSentiment = "good" | "bad" | "neutral";

export interface TrendInfo {
  latestValue: number;
  latestUnit: string | null;
  latestFlag: string;
  latestDate: string;
  direction: TrendDirection | null;
  sentiment: TrendSentiment;
}

export function computeTrend(
  slug: string,
  history: BiomarkerHistoryPoint[],
  referenceRange: ReferenceRange | null
): TrendInfo | null {
  const points = history
    .filter((h) => h.value !== null && h.collectionDate !== null)
    .map((h) => {
      const converted = convertToCanonical(slug, h.value!, h.unit);
      return {
        value: converted.value,
        unit: converted.unit,
        flag: h.flag,
        collectionDate: h.collectionDate!,
      };
    })
    .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));

  if (points.length === 0) return null;

  const latest = points[0];
  const previous = points.length >= 2 ? points[1] : null;

  let direction: TrendDirection | null = null;
  if (previous) {
    if (latest.value > previous.value) direction = "up";
    else if (latest.value < previous.value) direction = "down";
    else direction = "flat";
  }

  let sentiment: TrendSentiment = "neutral";
  if (direction && direction !== "flat" && referenceRange) {
    const { goalDirection, rangeLow, rangeHigh } = referenceRange;
    if (goalDirection === "below") {
      sentiment = direction === "down" ? "good" : "bad";
    } else if (goalDirection === "above") {
      sentiment = direction === "up" ? "good" : "bad";
    } else if (goalDirection === "within" && rangeLow != null && rangeHigh != null && previous) {
      const mid = (rangeLow + rangeHigh) / 2;
      const prevDist = Math.abs(previous.value - mid);
      const currDist = Math.abs(latest.value - mid);
      sentiment = currDist < prevDist ? "good" : currDist > prevDist ? "bad" : "neutral";
    }
  }

  return {
    latestValue: latest.value,
    latestUnit: latest.unit,
    latestFlag: latest.flag,
    latestDate: latest.collectionDate,
    direction,
    sentiment,
  };
}
