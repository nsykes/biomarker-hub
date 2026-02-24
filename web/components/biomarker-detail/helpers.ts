import { BiomarkerHistoryPoint } from "@/lib/types";

export function formatValue(point: BiomarkerHistoryPoint): string {
  if (point.valueText) return point.valueText;
  if (point.value !== null) {
    const prefix = point.valueModifier ?? "";
    return `${prefix}${point.value}`;
  }
  return "\u2014";
}
