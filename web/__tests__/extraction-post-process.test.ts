import { describe, it, expect } from "vitest";
import type { Biomarker } from "@/lib/types";
import { dedupBiomarkers } from "@/lib/extraction/post-process";

function makeBiomarker(overrides: Partial<Biomarker> = {}): Biomarker {
  return {
    id: crypto.randomUUID(),
    category: "Metabolic",
    metricName: "Glucose",
    rawName: "Glucose",
    value: 95,
    valueText: null,
    valueModifier: null,
    unit: "mg/dL",
    referenceRangeLow: 70,
    referenceRangeHigh: 100,
    flag: "NORMAL",
    page: 1,
    region: null,
    canonicalSlug: null,
    ...overrides,
  };
}

describe("dedupBiomarkers", () => {
  it("keeps the first occurrence when slug duplicates", () => {
    const first = makeBiomarker({ canonicalSlug: "glucose", page: 1, value: 95 });
    const later = makeBiomarker({ canonicalSlug: "glucose", page: 5, value: 95 });
    const result = dedupBiomarkers([first, later]);
    expect(result).toHaveLength(1);
    expect(result[0].page).toBe(1);
  });

  it("treats different slugs as distinct", () => {
    const glucose = makeBiomarker({ canonicalSlug: "glucose" });
    const hdl = makeBiomarker({ canonicalSlug: "hdl-cholesterol" });
    expect(dedupBiomarkers([glucose, hdl])).toHaveLength(2);
  });

  it("dedups unmatched entries by rawName+value", () => {
    const a = makeBiomarker({
      canonicalSlug: null,
      rawName: "Mystery X",
      value: 42,
    });
    const aDupe = makeBiomarker({
      canonicalSlug: null,
      rawName: "Mystery X",
      value: 42,
      page: 9,
    });
    const b = makeBiomarker({
      canonicalSlug: null,
      rawName: "Mystery X",
      value: 43, // different value → kept
    });
    const result = dedupBiomarkers([a, aDupe, b]);
    expect(result).toHaveLength(2);
  });
});
