// ────────────────────────────────────────────────
// Canonical Biomarker Registry
// ────────────────────────────────────────────────
// Source of truth for all recognized biomarkers.
// Each entry has a stable `slug` that never changes,
// plus aliases covering known lab-report variants.

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
  | "Vitamins";

export interface CanonicalBiomarker {
  slug: string;
  displayName: string;
  category: BiomarkerCategory;
  defaultUnit: string | null;
  aliases: string[];
  region: string | null;
  regionGroupSlug: string | null;
  specimenType: "blood" | "urine" | "body_composition" | null;
}

// ── DEXA Body Composition generator ─────────────

const BODY_COMP_REGIONS = [
  { name: "Total Body", slugSuffix: "total-body" },
  { name: "Arms", slugSuffix: "arms" },
  { name: "Legs", slugSuffix: "legs" },
  { name: "Trunk", slugSuffix: "trunk" },
  { name: "Android", slugSuffix: "android" },
  { name: "Gynoid", slugSuffix: "gynoid" },
  { name: "Right Arm", slugSuffix: "right-arm" },
  { name: "Left Arm", slugSuffix: "left-arm" },
  { name: "Right Leg", slugSuffix: "right-leg" },
  { name: "Left Leg", slugSuffix: "left-leg" },
] as const;

const BODY_COMP_METRICS = [
  { groupSlug: "fat-pct", displayName: "Fat %", unit: "%", aliases: ["FAT %", "FAT PERCENTAGE", "% FAT", "BODY FAT PERCENTAGE"] },
  { groupSlug: "total-mass", displayName: "Total Mass", unit: "lbs", aliases: ["TOTAL MASS", "MASS"] },
  { groupSlug: "fat-tissue-mass", displayName: "Fat Tissue Mass", unit: "lbs", aliases: ["FAT TISSUE MASS", "FAT MASS", "FAT TISSUE"] },
  { groupSlug: "lean-tissue-mass", displayName: "Lean Tissue Mass", unit: "lbs", aliases: ["LEAN TISSUE MASS", "LEAN MASS", "LEAN TISSUE"] },
  { groupSlug: "bmc", displayName: "BMC", unit: "lbs", aliases: ["BMC", "BONE MINERAL CONTENT"] },
] as const;

function generateBodyCompEntries(): CanonicalBiomarker[] {
  const entries: CanonicalBiomarker[] = [];
  for (const metric of BODY_COMP_METRICS) {
    for (const region of BODY_COMP_REGIONS) {
      const isTotal = region.name === "Total Body";
      entries.push({
        slug: `${metric.groupSlug}-${region.slugSuffix}`,
        displayName: isTotal ? metric.displayName : `${metric.displayName} (${region.name})`,
        category: "Body Composition",
        defaultUnit: metric.unit,
        aliases: [...metric.aliases],
        region: isTotal ? null : region.name,
        regionGroupSlug: metric.groupSlug,
        specimenType: "body_composition",
      });
    }
  }
  return entries;
}

// ── DEXA Bone generator ─────────────────────────

const BONE_REGIONS = [
  { name: "Total Body", slugSuffix: "total-body" },
  { name: "L1-L4", slugSuffix: "l1-l4" },
  { name: "Left Femur Neck", slugSuffix: "left-femur-neck" },
  { name: "Left Femur Total", slugSuffix: "left-femur-total" },
  { name: "Right Femur Neck", slugSuffix: "right-femur-neck" },
  { name: "Right Femur Total", slugSuffix: "right-femur-total" },
] as const;

const BONE_METRICS = [
  { groupSlug: "bmd", displayName: "BMD", unit: "g/cm\u00B2", aliases: ["BMD", "BONE MINERAL DENSITY"] },
  { groupSlug: "t-score", displayName: "T-Score", unit: null, aliases: ["T-SCORE", "T SCORE"] },
  { groupSlug: "z-score", displayName: "Z-Score", unit: null, aliases: ["Z-SCORE", "Z SCORE"] },
] as const;

function generateBoneEntries(): CanonicalBiomarker[] {
  const entries: CanonicalBiomarker[] = [];
  for (const metric of BONE_METRICS) {
    for (const region of BONE_REGIONS) {
      const isTotal = region.name === "Total Body";
      entries.push({
        slug: `${metric.groupSlug}-${region.slugSuffix}`,
        displayName: isTotal ? metric.displayName : `${metric.displayName} (${region.name})`,
        category: "Bone",
        defaultUnit: metric.unit,
        aliases: [...metric.aliases],
        region: isTotal ? null : region.name,
        regionGroupSlug: metric.groupSlug,
        specimenType: "body_composition",
      });
    }
  }
  return entries;
}

// ── Registry ────────────────────────────────────

export const REGISTRY: CanonicalBiomarker[] = [
  // ─── Heart (14) ───
  {
    slug: "total-cholesterol", displayName: "Total Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    aliases: ["CHOLESTEROL TOTAL", "TOTAL CHOLESTEROL", "CHOLESTEROL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hdl-cholesterol", displayName: "HDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    aliases: ["HDL CHOLESTEROL", "HDL-C", "HDL", "CHOLESTEROL HDL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-cholesterol", displayName: "LDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    aliases: ["LDL CHOLESTEROL", "LDL-C", "LDL CHOLESTEROL CALC", "LDL CHOL CALC (NIH)", "LDL-CHOLESTEROL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "triglycerides", displayName: "Triglycerides",
    category: "Heart", defaultUnit: "mg/dL",
    aliases: ["TRIGLYCERIDES", "TRIGLYCERIDE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "apolipoprotein-b", displayName: "Apolipoprotein B",
    category: "Heart", defaultUnit: "mg/dL",
    aliases: ["APOLIPOPROTEIN B", "APOLIPOPROTEIN B (APOB)", "APO B", "APOB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lipoprotein-a", displayName: "Lipoprotein(a)",
    category: "Heart", defaultUnit: "nmol/L",
    aliases: ["LIPOPROTEIN (A)", "LIPOPROTEIN(A)", "LP(A)", "LPA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-particle-number", displayName: "LDL Particle Number",
    category: "Heart", defaultUnit: "nmol/L",
    aliases: ["LDL PARTICLE NUMBER", "LDL-P"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "small-ldl-particle-number", displayName: "Small LDL Particle Number",
    category: "Heart", defaultUnit: "nmol/L",
    aliases: ["SMALL LDL-P", "SMALL LDL PARTICLE NUMBER", "LDL SMALL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-medium", displayName: "LDL Medium",
    category: "Heart", defaultUnit: "nmol/L",
    aliases: ["LDL MEDIUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hdl-large", displayName: "HDL Large",
    category: "Heart", defaultUnit: "nmol/L",
    aliases: ["HDL LARGE", "HDL-LARGE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-pattern", displayName: "LDL Pattern",
    category: "Heart", defaultUnit: null,
    aliases: ["LDL PATTERN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-peak-size", displayName: "LDL Peak Size",
    category: "Heart", defaultUnit: "\u00C5",
    aliases: ["LDL PEAK SIZE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tc-hdl-ratio", displayName: "Total Cholesterol/HDL Ratio",
    category: "Heart", defaultUnit: null,
    aliases: ["TC/HDL RATIO", "CHOL/HDL RATIO", "CHOLESTEROL/HDL RATIO", "CHOL/HDLC RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tg-hdl-ratio", displayName: "Triglycerides/HDL Ratio",
    category: "Heart", defaultUnit: null,
    aliases: ["TG/HDL RATIO", "TRIGLYCERIDES/HDL RATIO", "TRIG/HDL-C"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Metabolic (9) ───
  {
    slug: "glucose", displayName: "Glucose",
    category: "Metabolic", defaultUnit: "mg/dL",
    aliases: ["GLUCOSE", "GLUCOSE FASTING", "FASTING GLUCOSE", "GLUCOSE SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "hemoglobin-a1c", displayName: "Hemoglobin A1c",
    category: "Metabolic", defaultUnit: "%",
    aliases: ["HEMOGLOBIN A1C", "HEMOGLOBIN A1C (HBA1C)", "HBA1C", "A1C", "HGB A1C"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "insulin", displayName: "Insulin",
    category: "Metabolic", defaultUnit: "\u00B5IU/mL",
    aliases: ["INSULIN", "INSULIN FASTING", "FASTING INSULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "uric-acid", displayName: "Uric Acid",
    category: "Metabolic", defaultUnit: "mg/dL",
    aliases: ["URIC ACID"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "homocysteine", displayName: "Homocysteine",
    category: "Metabolic", defaultUnit: "\u00B5mol/L",
    aliases: ["HOMOCYSTEINE", "HOMOCYSTEINE PLASMA", "HOMOCYST(E)INE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "methylmalonic-acid", displayName: "Methylmalonic Acid",
    category: "Metabolic", defaultUnit: "nmol/L",
    aliases: ["METHYLMALONIC ACID", "MMA", "METHYLMALONIC ACID SERUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "leptin", displayName: "Leptin",
    category: "Metabolic", defaultUnit: "ng/mL",
    aliases: ["LEPTIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "amylase", displayName: "Amylase",
    category: "Metabolic", defaultUnit: "U/L",
    aliases: ["AMYLASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lipase", displayName: "Lipase",
    category: "Metabolic", defaultUnit: "U/L",
    aliases: ["LIPASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Kidney (4) ───
  {
    slug: "blood-urea-nitrogen", displayName: "Blood Urea Nitrogen",
    category: "Kidney", defaultUnit: "mg/dL",
    aliases: ["UREA NITROGEN (BUN)", "BUN", "BLOOD UREA NITROGEN", "UREA NITROGEN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "creatinine", displayName: "Creatinine",
    category: "Kidney", defaultUnit: "mg/dL",
    aliases: ["CREATININE", "CREATININE SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "egfr", displayName: "eGFR",
    category: "Kidney", defaultUnit: "mL/min/1.73m\u00B2",
    aliases: ["EGFR", "EGFR IF NONAFRICN AM", "EGFR NON-AFR. AMERICAN", "EGFR IF AFRICAN AM", "GLOMERULAR FILTRATION RATE ESTIMATED", "GFR ESTIMATED", "EGFR (CKD-EPI 2021)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "bun-creatinine-ratio", displayName: "BUN/Creatinine Ratio",
    category: "Kidney", defaultUnit: null,
    aliases: ["BUN/CREATININE RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Electrolytes (5) ───
  {
    slug: "sodium", displayName: "Sodium",
    category: "Electrolytes", defaultUnit: "mmol/L",
    aliases: ["SODIUM", "NA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "potassium", displayName: "Potassium",
    category: "Electrolytes", defaultUnit: "mmol/L",
    aliases: ["POTASSIUM", "K"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "chloride", displayName: "Chloride",
    category: "Electrolytes", defaultUnit: "mmol/L",
    aliases: ["CHLORIDE", "CL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "carbon-dioxide", displayName: "Carbon Dioxide",
    category: "Electrolytes", defaultUnit: "mmol/L",
    aliases: ["CARBON DIOXIDE TOTAL", "CO2", "CARBON DIOXIDE", "CO2 TOTAL", "BICARBONATE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "calcium", displayName: "Calcium",
    category: "Electrolytes", defaultUnit: "mg/dL",
    aliases: ["CALCIUM", "CA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Proteins (4) ───
  {
    slug: "total-protein", displayName: "Total Protein",
    category: "Proteins", defaultUnit: "g/dL",
    aliases: ["PROTEIN", "PROTEIN TOTAL", "TOTAL PROTEIN"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "albumin", displayName: "Albumin",
    category: "Proteins", defaultUnit: "g/dL",
    aliases: ["ALBUMIN", "ALBUMIN SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "globulin", displayName: "Globulin",
    category: "Proteins", defaultUnit: "g/dL",
    aliases: ["GLOBULIN TOTAL", "GLOBULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ag-ratio", displayName: "Albumin/Globulin Ratio",
    category: "Proteins", defaultUnit: null,
    aliases: ["A/G RATIO", "ALBUMIN/GLOBULIN RATIO"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },

  // ─── Liver (5) ───
  {
    slug: "bilirubin-total", displayName: "Bilirubin Total",
    category: "Liver", defaultUnit: "mg/dL",
    aliases: ["BILIRUBIN TOTAL", "BILIRUBIN", "TOTAL BILIRUBIN"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "alkaline-phosphatase", displayName: "Alkaline Phosphatase",
    category: "Liver", defaultUnit: "U/L",
    aliases: ["ALKALINE PHOSPHATASE", "ALK PHOSPHATASE", "ALP"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ast", displayName: "AST",
    category: "Liver", defaultUnit: "U/L",
    aliases: ["AST (SGOT)", "AST", "SGOT", "ASPARTATE AMINOTRANSFERASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "alt", displayName: "ALT",
    category: "Liver", defaultUnit: "U/L",
    aliases: ["ALT (SGPT)", "ALT", "SGPT", "ALANINE AMINOTRANSFERASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ggt", displayName: "GGT",
    category: "Liver", defaultUnit: "U/L",
    aliases: ["GGT", "GAMMA-GLUTAMYL TRANSFERASE", "GAMMA GLUTAMYL TRANSPEPTIDASE", "GAMMA-GLUTAMYL TRANSPEPTIDASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Iron (4) ───
  {
    slug: "iron-total", displayName: "Iron Total",
    category: "Iron", defaultUnit: "\u00B5g/dL",
    aliases: ["IRON TOTAL", "IRON", "IRON SERUM", "FE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tibc", displayName: "Total Iron Binding Capacity",
    category: "Iron", defaultUnit: "\u00B5g/dL",
    aliases: ["IRON BIND.CAP.(TIBC)", "TIBC", "TOTAL IRON BINDING CAPACITY", "IRON BINDING CAPACITY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "iron-saturation", displayName: "Iron Saturation",
    category: "Iron", defaultUnit: "%",
    aliases: ["IRON SATURATION", "% SATURATION", "IRON % SATURATION"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ferritin", displayName: "Ferritin",
    category: "Iron", defaultUnit: "ng/mL",
    aliases: ["FERRITIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── CBC (20) ───
  {
    slug: "wbc", displayName: "White Blood Cell Count",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["WBC", "WHITE BLOOD CELL COUNT", "WHITE BLOOD CELLS"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "rbc", displayName: "Red Blood Cell Count",
    category: "CBC", defaultUnit: "x10\u2076/\u00B5L",
    aliases: ["RBC", "RED BLOOD CELL COUNT", "RED BLOOD CELLS"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "hemoglobin", displayName: "Hemoglobin",
    category: "CBC", defaultUnit: "g/dL",
    aliases: ["HEMOGLOBIN", "HGB", "HB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hematocrit", displayName: "Hematocrit",
    category: "CBC", defaultUnit: "%",
    aliases: ["HEMATOCRIT", "HCT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mcv", displayName: "MCV",
    category: "CBC", defaultUnit: "fL",
    aliases: ["MCV", "MEAN CORPUSCULAR VOLUME"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mch", displayName: "MCH",
    category: "CBC", defaultUnit: "pg",
    aliases: ["MCH", "MEAN CORPUSCULAR HEMOGLOBIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mchc", displayName: "MCHC",
    category: "CBC", defaultUnit: "g/dL",
    aliases: ["MCHC", "MEAN CORPUSCULAR HB CONC"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rdw", displayName: "RDW",
    category: "CBC", defaultUnit: "%",
    aliases: ["RDW", "RED CELL DISTRIBUTION WIDTH", "RDW-CV"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "platelets", displayName: "Platelets",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["PLATELET COUNT", "PLATELETS", "PLT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mpv", displayName: "MPV",
    category: "CBC", defaultUnit: "fL",
    aliases: ["MPV", "MEAN PLATELET VOLUME"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "neutrophils-absolute", displayName: "Neutrophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["NEUTROPHILS (ABSOLUTE)", "NEUTROPHILS ABS", "ABSOLUTE NEUTROPHILS", "ABS NEUTROPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lymphocytes-absolute", displayName: "Lymphocytes Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["LYMPHOCYTES (ABSOLUTE)", "LYMPHOCYTES ABS", "LYMPHS (ABSOLUTE)", "ABSOLUTE LYMPHOCYTES", "ABS LYMPHOCYTES"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "monocytes-absolute", displayName: "Monocytes Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["MONOCYTES (ABSOLUTE)", "MONOCYTES ABS", "MONOCYTES(ABSOLUTE)", "ABSOLUTE MONOCYTES", "ABS MONOCYTES"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "eosinophils-absolute", displayName: "Eosinophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["EOSINOPHILS (ABSOLUTE)", "EOS (ABSOLUTE)", "ABSOLUTE EOSINOPHILS", "ABS EOSINOPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "basophils-absolute", displayName: "Basophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    aliases: ["BASOPHILS (ABSOLUTE)", "BASO (ABSOLUTE)", "ABSOLUTE BASOPHILS", "ABS BASOPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "neutrophils-pct", displayName: "Neutrophils %",
    category: "CBC", defaultUnit: "%",
    aliases: ["NEUTROPHILS", "NEUTROPHILS %"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lymphocytes-pct", displayName: "Lymphocytes %",
    category: "CBC", defaultUnit: "%",
    aliases: ["LYMPHOCYTES", "LYMPHOCYTES %", "LYMPHS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "monocytes-pct", displayName: "Monocytes %",
    category: "CBC", defaultUnit: "%",
    aliases: ["MONOCYTES", "MONOCYTES %"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "eosinophils-pct", displayName: "Eosinophils %",
    category: "CBC", defaultUnit: "%",
    aliases: ["EOSINOPHILS", "EOSINOPHILS %", "EOS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "basophils-pct", displayName: "Basophils %",
    category: "CBC", defaultUnit: "%",
    aliases: ["BASOPHILS", "BASOPHILS %", "BASO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Inflammation (2) ───
  {
    slug: "hs-crp", displayName: "High-Sensitivity C-Reactive Protein",
    category: "Inflammation", defaultUnit: "mg/L",
    aliases: ["HS-CRP", "HS CRP", "HSCRP", "C-REACTIVE PROTEIN CARDIAC", "HIGH SENSITIVITY C-REACTIVE PROTEIN", "HIGH-SENSITIVITY C-REACTIVE PROTEIN", "CRP HIGH SENSITIVITY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rheumatoid-factor", displayName: "Rheumatoid Factor",
    category: "Inflammation", defaultUnit: "IU/mL",
    aliases: ["RHEUMATOID FACTOR", "RF QUANT", "RHEUMATOID FACTOR QUANT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Thyroid (5) ───
  {
    slug: "tsh", displayName: "TSH",
    category: "Thyroid", defaultUnit: "\u00B5IU/mL",
    aliases: ["TSH", "THYROID STIMULATING HORMONE", "THYROTROPIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "free-t4", displayName: "Free T4",
    category: "Thyroid", defaultUnit: "ng/dL",
    aliases: ["FREE T4", "T4 FREE", "T4FREE(DIRECT)", "THYROXINE (T4) FREE DIRECT", "FREE THYROXINE", "T4 FREE (DIRECT)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "free-t3", displayName: "Free T3",
    category: "Thyroid", defaultUnit: "pg/mL",
    aliases: ["FREE T3", "T3 FREE", "TRIIODOTHYRONINE (T3) FREE", "FREE TRIIODOTHYRONINE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "thyroglobulin-antibody", displayName: "Thyroglobulin Antibody",
    category: "Thyroid", defaultUnit: "IU/mL",
    aliases: ["THYROGLOBULIN ANTIBODIES", "THYROGLOBULIN ANTIBODY", "THYROGLOBULIN AB", "ANTI-THYROGLOBULIN AB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tpo-antibody", displayName: "TPO Antibody",
    category: "Thyroid", defaultUnit: "IU/mL",
    aliases: ["THYROID PEROXIDASE (TPO) AB", "TPO AB", "TPO ANTIBODY", "THYROID PEROXIDASE ANTIBODIES", "ANTI-TPO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Endocrinology (9) ───
  {
    slug: "testosterone-total", displayName: "Testosterone Total",
    category: "Endocrinology", defaultUnit: "ng/dL",
    aliases: ["TESTOSTERONE TOTAL", "TESTOSTERONE", "TOTAL TESTOSTERONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "testosterone-free", displayName: "Testosterone Free",
    category: "Endocrinology", defaultUnit: "pg/mL",
    aliases: ["FREE TESTOSTERONE(DIRECT)", "FREE TESTOSTERONE", "TESTOSTERONE FREE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dhea-s", displayName: "DHEA-Sulfate",
    category: "Endocrinology", defaultUnit: "\u00B5g/dL",
    aliases: ["DHEA-SULFATE", "DHEA SULFATE", "DEHYDROEPIANDROSTERONE SULFATE", "DHEA-S"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "fsh", displayName: "FSH",
    category: "Endocrinology", defaultUnit: "mIU/mL",
    aliases: ["FSH", "FOLLICLE STIMULATING HORMONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lh", displayName: "LH",
    category: "Endocrinology", defaultUnit: "mIU/mL",
    aliases: ["LH", "LUTEINIZING HORMONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "prolactin", displayName: "Prolactin",
    category: "Endocrinology", defaultUnit: "ng/mL",
    aliases: ["PROLACTIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "shbg", displayName: "SHBG",
    category: "Endocrinology", defaultUnit: "nmol/L",
    aliases: ["SHBG", "SEX HORM BINDING GLOB", "SEX HORMONE BINDING GLOBULIN", "SEX HORM BINDING GLOBULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "estradiol", displayName: "Estradiol",
    category: "Endocrinology", defaultUnit: "pg/mL",
    aliases: ["ESTRADIOL", "ESTRADIOL E2"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "cortisol", displayName: "Cortisol",
    category: "Endocrinology", defaultUnit: "\u00B5g/dL",
    aliases: ["CORTISOL", "CORTISOL TOTAL", "CORTISOL AM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Fatty Acids (10) ───
  {
    slug: "epa", displayName: "EPA",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["EPA", "EICOSAPENTAENOIC ACID", "EICOSAPENTAENOIC (EPA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dpa", displayName: "DPA",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["DPA", "DOCOSAPENTAENOIC ACID", "DOCOSAPENTAENOIC (DPA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dha", displayName: "DHA",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["DHA", "DOCOSAHEXAENOIC ACID", "DOCOSAHEXAENOIC (DHA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "epa-dpa-dha", displayName: "EPA+DPA+DHA",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["EPA+DPA+DHA", "EPA + DPA + DHA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "omega-3-total", displayName: "Omega-3 Total",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["OMEGA-3 TOTAL", "OMEGA 3 TOTAL", "TOTAL OMEGA-3"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "omega-6-total", displayName: "Omega-6 Total",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["OMEGA-6 TOTAL", "OMEGA 6 TOTAL", "TOTAL OMEGA-6"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "arachidonic-acid", displayName: "Arachidonic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["ARACHIDONIC ACID", "ARACHIDONIC (AA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "linoleic-acid", displayName: "Linoleic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    aliases: ["LINOLEIC ACID", "LINOLEIC"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "aa-epa-ratio", displayName: "AA/EPA Ratio",
    category: "Fatty Acids", defaultUnit: null,
    aliases: ["AA/EPA RATIO", "ARACHIDONIC/EPA RATIO", "ARACHIDONIC ACID/EPA RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "omega-6-omega-3-ratio", displayName: "Omega-6/Omega-3 Ratio",
    category: "Fatty Acids", defaultUnit: null,
    aliases: ["OMEGA-6/OMEGA-3 RATIO", "OMEGA 6/OMEGA 3 RATIO", "OMEGA6/OMEGA3 RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Prostate (3) ───
  {
    slug: "psa-total", displayName: "PSA Total",
    category: "Prostate", defaultUnit: "ng/mL",
    aliases: ["PROSTATE-SPECIFIC AG", "PSA TOTAL", "PSA", "PROSTATE SPECIFIC ANTIGEN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "psa-free", displayName: "PSA Free",
    category: "Prostate", defaultUnit: "ng/mL",
    aliases: ["PSA FREE", "FREE PSA", "PROSTATE-SPECIFIC AG FREE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "psa-pct-free", displayName: "PSA % Free",
    category: "Prostate", defaultUnit: "%",
    aliases: ["PSA % FREE", "% FREE PSA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Vitamins (3) ───
  {
    slug: "vitamin-d", displayName: "Vitamin D 25-Hydroxy",
    category: "Vitamins", defaultUnit: "ng/mL",
    aliases: ["VITAMIN D 25-HYDROXY TOTAL", "VITAMIN D 25-OH TOTAL", "25-HYDROXYVITAMIN D", "VITAMIN D TOTAL", "VIT D 25-OH TOTAL", "VITAMIN D 25-HYDROXY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "zinc", displayName: "Zinc",
    category: "Vitamins", defaultUnit: "\u00B5g/dL",
    aliases: ["ZINC", "ZINC PLASMA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "magnesium-rbc", displayName: "Magnesium RBC",
    category: "Vitamins", defaultUnit: "mg/dL",
    aliases: ["MAGNESIUM RBC", "MAGNESIUM RED BLOOD CELL", "RBC MAGNESIUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Toxins (2) ───
  {
    slug: "lead", displayName: "Lead",
    category: "Toxins", defaultUnit: "\u00B5g/dL",
    aliases: ["LEAD", "LEAD BLOOD", "LEAD (BLOOD)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mercury", displayName: "Mercury",
    category: "Toxins", defaultUnit: "\u00B5g/L",
    aliases: ["MERCURY", "MERCURY BLOOD", "MERCURY (BLOOD)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Autoimmune (1) ───
  {
    slug: "ana-screen", displayName: "ANA Screen",
    category: "Autoimmune", defaultUnit: null,
    aliases: ["ANA SCREEN IFA", "ANA SCREEN", "ANA", "ANTINUCLEAR ANTIBODY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Celiac (6) ───
  {
    slug: "ttg-igg", displayName: "tTG IgG",
    category: "Celiac", defaultUnit: "U/mL",
    aliases: ["TTG IGG", "T-TRANSGLUTAMINASE (TTG) IGG", "TISSUE TRANSGLUTAMINASE IGG"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ttg-iga", displayName: "tTG IgA",
    category: "Celiac", defaultUnit: "U/mL",
    aliases: ["TTG IGA", "T-TRANSGLUTAMINASE (TTG) IGA", "TISSUE TRANSGLUTAMINASE IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "gliadin-iga", displayName: "Gliadin IgA",
    category: "Celiac", defaultUnit: "U/mL",
    aliases: ["GLIADIN IGA", "GLIADIN ANTIBODY IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "deamidated-gliadin-iga", displayName: "Deamidated Gliadin IgA",
    category: "Celiac", defaultUnit: "U/mL",
    aliases: ["DEAMIDATED GLIADIN ABS IGA", "DEAMIDATED GLIADIN IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "deamidated-gliadin-igg", displayName: "Deamidated Gliadin IgG",
    category: "Celiac", defaultUnit: "U/mL",
    aliases: ["DEAMIDATED GLIADIN ABS IGG", "DEAMIDATED GLIADIN IGG"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "iga-total", displayName: "Immunoglobulin A",
    category: "Celiac", defaultUnit: "mg/dL",
    aliases: ["IGA", "IMMUNOGLOBULIN A", "IGA TOTAL", "IGG/IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Blood Type (2) ───
  {
    slug: "abo-group", displayName: "ABO Group",
    category: "Blood Type", defaultUnit: null,
    aliases: ["ABO GROUP", "ABO TYPE", "ABO BLOOD TYPE", "BLOOD TYPE ABO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rh-type", displayName: "Rh Type",
    category: "Blood Type", defaultUnit: null,
    aliases: ["RH TYPE", "RH(D) TYPE", "RH FACTOR", "RH(D) TYPING"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Urinalysis (17) ───
  {
    slug: "urine-color", displayName: "Color (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["COLOR", "URINE COLOR"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-appearance", displayName: "Appearance (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["APPEARANCE", "URINE APPEARANCE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-specific-gravity", displayName: "Specific Gravity",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["SPECIFIC GRAVITY", "SP GRAVITY"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-ph", displayName: "pH (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["PH", "URINE PH"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-glucose", displayName: "Glucose (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["GLUCOSE", "GLUCOSE URINE", "URINE GLUCOSE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-bilirubin", displayName: "Bilirubin (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["BILIRUBIN", "BILIRUBIN URINE", "URINE BILIRUBIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-ketones", displayName: "Ketones",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["KETONES", "URINE KETONES", "KETONE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-occult-blood", displayName: "Occult Blood",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["OCCULT BLOOD", "BLOOD URINE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-protein", displayName: "Protein (Urine)",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["PROTEIN", "PROTEIN URINE", "URINE PROTEIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-nitrite", displayName: "Nitrite",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["NITRITE", "NITRITE URINE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-leukocyte-esterase", displayName: "Leukocyte Esterase",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["LEUKOCYTE ESTERASE", "LE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-wbc", displayName: "WBC (Urine)",
    category: "Urinalysis", defaultUnit: "/HPF",
    aliases: ["WBC", "WBC URINE", "URINE WBC"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-rbc", displayName: "RBC (Urine)",
    category: "Urinalysis", defaultUnit: "/HPF",
    aliases: ["RBC", "RBC URINE", "URINE RBC"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-epithelial-cells", displayName: "Epithelial Cells",
    category: "Urinalysis", defaultUnit: "/HPF",
    aliases: ["EPITHELIAL CELLS", "SQUAMOUS EPITHELIAL CELLS", "SQ. EPITHELIAL CELLS"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-bacteria", displayName: "Bacteria",
    category: "Urinalysis", defaultUnit: null,
    aliases: ["BACTERIA"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-hyaline-cast", displayName: "Hyaline Cast",
    category: "Urinalysis", defaultUnit: "/LPF",
    aliases: ["HYALINE CAST", "HYALINE CASTS"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-albumin", displayName: "Albumin (Urine)",
    category: "Urinalysis", defaultUnit: "mg/dL",
    aliases: ["ALBUMIN", "ALBUMIN URINE", "URINE ALBUMIN", "MICROALBUMIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },

  // ─── Body Composition — special metrics (5) ───
  {
    slug: "resting-metabolic-rate", displayName: "Resting Metabolic Rate",
    category: "Body Composition", defaultUnit: "kcal/day",
    aliases: ["RMR", "RESTING METABOLIC RATE", "ESTIMATED RESTING METABOLIC RATE"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "android-gynoid-ratio", displayName: "Android/Gynoid Ratio",
    category: "Body Composition", defaultUnit: null,
    aliases: ["A/G RATIO", "ANDROID/GYNOID RATIO"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "vat-mass", displayName: "VAT Mass",
    category: "Body Composition", defaultUnit: "lbs",
    aliases: ["VAT MASS", "VISCERAL ADIPOSE TISSUE MASS"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "vat-volume", displayName: "VAT Volume",
    category: "Body Composition", defaultUnit: "in\u00B3",
    aliases: ["VAT VOLUME", "VISCERAL ADIPOSE TISSUE VOLUME"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "subcutaneous-adipose", displayName: "Subcutaneous Adipose",
    category: "Body Composition", defaultUnit: "lbs",
    aliases: ["SUBCUTANEOUS ADIPOSE", "SUBCUTANEOUS FAT"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },

  // ─── Body Composition — regional (50 generated) ───
  ...generateBodyCompEntries(),

  // ─── Bone (18 generated) ───
  ...generateBoneEntries(),
];

// ── Alias lookup map ────────────────────────────

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}

const aliasMap = new Map<string, CanonicalBiomarker[]>();
for (const entry of REGISTRY) {
  for (const alias of entry.aliases) {
    const key = normalize(alias);
    const existing = aliasMap.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      aliasMap.set(key, [entry]);
    }
  }
}

// ── Match function ──────────────────────────────

export function matchBiomarker(
  rawName: string,
  specimenType: "blood" | "urine" | "body_composition" | null,
  region: string | null
): CanonicalBiomarker | null {
  const key = normalize(rawName);
  const candidates = aliasMap.get(key);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Normalize "Total Body" region to null (prompt instructs region: null for total body)
  const normalizedRegion =
    region && region.toUpperCase() === "TOTAL BODY" ? null : region;

  // Disambiguate by specimenType
  if (specimenType) {
    const bySpecimen = candidates.filter(
      (c) => c.specimenType === specimenType
    );
    if (bySpecimen.length === 1) return bySpecimen[0];

    // Further disambiguate by region (DEXA entries)
    if (bySpecimen.length > 1) {
      const byRegion = bySpecimen.filter(
        (c) => c.region === normalizedRegion
      );
      if (byRegion.length === 1) return byRegion[0];
    }

    if (bySpecimen.length > 0) return bySpecimen[0];
  }

  // Disambiguate by region alone
  const byRegion = candidates.filter((c) => c.region === normalizedRegion);
  if (byRegion.length === 1) return byRegion[0];

  return candidates[0];
}
