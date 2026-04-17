import crypto from "crypto";
import { Biomarker, ExtractionResult } from "@/lib/types";
import { matchBiomarker } from "@/lib/biomarker-registry";
import { computeDerivatives } from "@/lib/derivative-calc";

const BODY_COMPOSITION_CATEGORIES = new Set([
  "Body Composition",
  "Bone",
  "Muscle Balance",
]);

function specimenFor(
  category: string
): "blood" | "urine" | "body_composition" {
  if (category === "Urinalysis") return "urine";
  if (BODY_COMPOSITION_CATEGORIES.has(category)) return "body_composition";
  return "blood";
}

/** Canonicalize each biomarker against the registry: populate slug, normalize
 *  metric name and category. Non-matching entries are left as-is with a null
 *  slug so they still surface in the UI. */
export function matchAgainstRegistry(biomarkers: Biomarker[]): Biomarker[] {
  return biomarkers.map((b) => {
    const canonical = matchBiomarker(
      b.rawName,
      specimenFor(b.category),
      b.region,
      b.metricName
    );
    return {
      ...b,
      canonicalSlug: canonical?.slug ?? null,
      metricName: canonical?.displayName ?? b.metricName,
      category: canonical?.category ?? b.category,
    };
  });
}

/** Drop duplicate biomarkers, keeping the first occurrence by document order.
 *  Matched biomarkers dedup by slug; unmatched dedup by rawName+value.
 *  Handles summary/appendix pages that restate earlier results. */
export function dedupBiomarkers(biomarkers: Biomarker[]): Biomarker[] {
  const seen = new Set<string>();
  return biomarkers.filter((b) => {
    const key = b.canonicalSlug ?? `${b.rawName}|${b.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Assign UUIDs, then append any derivative biomarkers computable from the
 *  current set (e.g., ratios). */
export function finalizeBiomarkers(biomarkers: Biomarker[]): Biomarker[] {
  const withIds = biomarkers.map((b) => ({ ...b, id: crypto.randomUUID() }));
  const derivatives = computeDerivatives(withIds);
  return [...withIds, ...derivatives];
}

/** Full post-process pipeline: match → dedup → ids → derivatives. */
export function postProcessExtraction(
  extraction: ExtractionResult
): ExtractionResult {
  let biomarkers = matchAgainstRegistry(extraction.biomarkers);
  biomarkers = dedupBiomarkers(biomarkers);
  biomarkers = finalizeBiomarkers(biomarkers);
  return { reportInfo: extraction.reportInfo, biomarkers };
}
