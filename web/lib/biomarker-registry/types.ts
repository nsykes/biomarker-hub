// ────────────────────────────────────────────────
// Canonical Biomarker Registry — Types
// ────────────────────────────────────────────────

export type BiomarkerCategory =
  | "Heart"
  | "Metabolic"
  | "Kidney"
  | "Liver"
  | "Electrolytes"
  | "Proteins"
  | "CBC"
  | "Inflammation"
  | "Thyroid"
  | "Endocrinology"
  | "Fatty Acids"
  | "Urinalysis"
  | "Prostate"
  | "Body Composition"
  | "Bone"
  | "Muscle Balance"
  | "Iron"
  | "Autoimmune"
  | "Celiac"
  | "Toxins"
  | "Blood Type"
  | "Vitamins"
  | "Genetic";

export interface DerivativeDefinition {
  components: string[];
  compute: (values: number[]) => number | null;
  precision?: number;
  formulaDisplay: string;
}

export interface CanonicalBiomarker {
  slug: string;
  displayName: string;
  fullName: string;
  category: BiomarkerCategory;
  defaultUnit: string | null;
  summary?: string;
  aliases: string[];
  region: string | null;
  regionGroupSlug: string | null;
  specimenType: "blood" | "urine" | "body_composition" | null;
  derivative?: DerivativeDefinition;
}
