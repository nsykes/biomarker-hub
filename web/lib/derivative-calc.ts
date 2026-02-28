import { Biomarker } from "@/lib/types";
import { REGISTRY } from "@/lib/biomarker-registry";

/**
 * Compute derivative biomarkers from an extracted set.
 * PDF-extracted values always win — if a derivative slug already
 * exists in the extracted set it is skipped.
 */
export function computeDerivatives(extractedBiomarkers: Biomarker[]): Biomarker[] {
  // Build slug → Biomarker lookup from extracted set
  const bySlug = new Map<string, Biomarker>();
  for (const b of extractedBiomarkers) {
    if (b.canonicalSlug) {
      bySlug.set(b.canonicalSlug, b);
    }
  }

  const derivatives: Biomarker[] = [];

  for (const entry of REGISTRY) {
    if (!entry.derivative) continue;

    // Skip if already extracted from PDF
    if (bySlug.has(entry.slug)) continue;

    const { components, compute, precision = 2 } = entry.derivative;

    // Gather component values
    const values: number[] = [];
    let missing = false;
    for (const slug of components) {
      const comp = bySlug.get(slug);
      if (!comp || comp.value === null) {
        missing = true;
        break;
      }
      values.push(comp.value);
    }
    if (missing) continue;

    // Check for division by zero in component values used as divisors
    // (handled by individual compute functions returning null)
    const result = compute(values);
    if (result === null || !isFinite(result)) continue;

    const rounded = parseFloat(result.toFixed(precision));

    derivatives.push({
      id: crypto.randomUUID(),
      category: entry.category,
      metricName: entry.displayName,
      rawName: entry.displayName,
      value: rounded,
      valueText: null,
      valueModifier: null,
      unit: entry.defaultUnit,
      referenceRangeLow: null,
      referenceRangeHigh: null,
      flag: "NORMAL",
      page: 0,
      region: entry.region,
      canonicalSlug: entry.slug,
      isCalculated: true,
    });
  }

  return derivatives;
}
