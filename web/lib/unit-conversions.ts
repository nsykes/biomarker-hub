// ────────────────────────────────────────────────
// Unit Conversion Module
// ────────────────────────────────────────────────
// Deterministic lookup table for normalizing biomarker values
// across labs that use different unit systems. Conversion factors
// are based on molecular weights — instant, free, 100% accurate.
// Store originals in DB, normalize at display time only.

interface ConversionEntry {
  fromUnit: string; // normalized form (lowercase, µ-normalized)
  toUnit: string; // canonical unit (matches registry defaultUnit)
  factor: number; // multiply input value by this to get canonical value
}

/** Lowercase, normalize unicode µ/μ, trim — for fuzzy unit matching. */
export function normalizeUnitString(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\u03bc/g, "\u00b5") // Greek mu (μ) → micro sign (µ)
    .replace(/\s+/g, " ")
    .trim();
}

const CONVERSIONS: Record<string, ConversionEntry[]> = {
  // Glucose: mmol/L → mg/dL (×18.016)
  glucose: [{ fromUnit: "mmol/l", toUnit: "mg/dL", factor: 18.016 }],

  // Cholesterol variants: mmol/L → mg/dL (×38.67)
  "total-cholesterol": [
    { fromUnit: "mmol/l", toUnit: "mg/dL", factor: 38.67 },
  ],
  "hdl-cholesterol": [
    { fromUnit: "mmol/l", toUnit: "mg/dL", factor: 38.67 },
  ],
  "ldl-cholesterol": [
    { fromUnit: "mmol/l", toUnit: "mg/dL", factor: 38.67 },
  ],
  "non-hdl-cholesterol": [
    { fromUnit: "mmol/l", toUnit: "mg/dL", factor: 38.67 },
  ],

  // Triglycerides: mmol/L → mg/dL (×88.57)
  triglycerides: [{ fromUnit: "mmol/l", toUnit: "mg/dL", factor: 88.57 }],

  // Calcium: mmol/L → mg/dL (×4.008)
  calcium: [{ fromUnit: "mmol/l", toUnit: "mg/dL", factor: 4.008 }],

  // Creatinine: µmol/L → mg/dL (÷88.42)
  creatinine: [{ fromUnit: "\u00b5mol/l", toUnit: "mg/dL", factor: 1 / 88.42 }],

  // Uric acid: µmol/L → mg/dL (÷59.48)
  "uric-acid": [{ fromUnit: "\u00b5mol/l", toUnit: "mg/dL", factor: 1 / 59.48 }],

  // BUN: mmol/L → mg/dL (×2.801)
  "blood-urea-nitrogen": [
    { fromUnit: "mmol/l", toUnit: "mg/dL", factor: 2.801 },
  ],

  // Bilirubin total: µmol/L → mg/dL (÷17.1)
  "bilirubin-total": [
    { fromUnit: "\u00b5mol/l", toUnit: "mg/dL", factor: 1 / 17.1 },
  ],

  // Iron total: µmol/L → µg/dL (×5.587)
  "iron-total": [{ fromUnit: "\u00b5mol/l", toUnit: "\u00b5g/dL", factor: 5.587 }],

  // Ferritin: µg/L → ng/mL (×1.0, unit alias)
  ferritin: [{ fromUnit: "\u00b5g/l", toUnit: "ng/mL", factor: 1.0 }],

  // TIBC: µmol/L → µg/dL (×5.587)
  tibc: [{ fromUnit: "\u00b5mol/l", toUnit: "\u00b5g/dL", factor: 5.587 }],

  // Testosterone total: nmol/L → ng/dL (×28.84)
  "testosterone-total": [
    { fromUnit: "nmol/l", toUnit: "ng/dL", factor: 28.84 },
  ],

  // Testosterone free: pmol/L → pg/mL (×0.2884)
  "testosterone-free": [
    { fromUnit: "pmol/l", toUnit: "pg/mL", factor: 0.2884 },
  ],

  // Cortisol: nmol/L → µg/dL (÷27.59)
  cortisol: [{ fromUnit: "nmol/l", toUnit: "\u00b5g/dL", factor: 1 / 27.59 }],

  // Insulin: pmol/L → µIU/mL (÷6.945)
  insulin: [{ fromUnit: "pmol/l", toUnit: "\u00b5IU/mL", factor: 1 / 6.945 }],

  // Homocysteine: mg/L → µmol/L (×7.397)
  homocysteine: [{ fromUnit: "mg/l", toUnit: "\u00b5mol/L", factor: 7.397 }],

  // Vitamin D: nmol/L → ng/mL (÷2.496)
  "vitamin-d": [{ fromUnit: "nmol/l", toUnit: "ng/mL", factor: 1 / 2.496 }],
};

/**
 * Convert a biomarker value to its canonical unit (from registry defaultUnit).
 * Returns `converted: false` if the unit already matches or no conversion exists.
 */
export function convertToCanonical(
  slug: string,
  value: number,
  unit: string | null
): { value: number; unit: string | null; converted: boolean } {
  if (!unit) return { value, unit, converted: false };

  const entries = CONVERSIONS[slug];
  if (!entries) return { value, unit, converted: false };

  const normalized = normalizeUnitString(unit);

  for (const entry of entries) {
    if (normalized === entry.fromUnit) {
      return {
        value: value * entry.factor,
        unit: entry.toUnit,
        converted: true,
      };
    }
  }

  return { value, unit, converted: false };
}
