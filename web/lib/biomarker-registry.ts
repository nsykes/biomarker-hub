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
  { groupSlug: "fat-pct", displayName: "Fat %", fullName: "Fat %", unit: "%", aliases: ["FAT %", "FAT PERCENTAGE", "% FAT", "BODY FAT PERCENTAGE"], summaryTemplate: "Fat % measures the proportion of fat tissue relative to total tissue in {region}. It is measured by DEXA scan, which uses low-dose X-rays to differentiate between fat, lean, and bone tissue. Higher fat percentages may indicate increased health risk, particularly in the trunk and android regions. Tracking changes over time helps assess the effectiveness of nutrition and exercise programs." },
  { groupSlug: "total-mass", displayName: "Total Mass", fullName: "Total Mass", unit: "lbs", aliases: ["TOTAL MASS", "MASS"], summaryTemplate: "Total Mass measures the combined weight of fat, lean, and bone tissue in {region}. It is measured by DEXA scan and provides a precise breakdown of body composition beyond what a scale can offer. Changes in total mass should be interpreted alongside fat and lean mass to understand body composition shifts. It is useful for tracking overall tissue changes during fitness or rehabilitation programs." },
  { groupSlug: "fat-tissue-mass", displayName: "Fat Tissue Mass", fullName: "Fat Tissue Mass", unit: "lbs", aliases: ["FAT TISSUE MASS", "FAT MASS", "FAT TISSUE"], summaryTemplate: "Fat Tissue Mass measures the weight of fat tissue in {region}. It is measured by DEXA scan and provides region-specific fat distribution data. Knowing where fat is distributed helps assess metabolic and cardiovascular risk beyond overall body fat percentage. Reductions in regional fat mass, particularly in the trunk, are associated with improved metabolic health." },
  { groupSlug: "lean-tissue-mass", displayName: "Lean Tissue Mass", fullName: "Lean Tissue Mass", unit: "lbs", aliases: ["LEAN TISSUE MASS", "LEAN MASS", "LEAN TISSUE"], summaryTemplate: "Lean Tissue Mass measures the weight of non-fat, non-bone tissue in {region}, including muscle, organs, body water, and connective tissue. It is measured by DEXA scan and is a key indicator of body composition and physical fitness. Low lean tissue mass is associated with sarcopenia, reduced strength, and impaired metabolism. Tracking lean mass over time helps assess the effectiveness of strength training and nutrition, though changes can also reflect hydration shifts." },
  { groupSlug: "bmc", displayName: "BMC", fullName: "Bone Mineral Content", unit: "lbs", aliases: ["BMC", "BONE MINERAL CONTENT"], summaryTemplate: "Bone Mineral Content (BMC) measures the total weight of mineral in the bones of {region}. It is measured by DEXA scan and reflects overall bone mass. Low BMC may be associated with increased fracture risk, though osteopenia and osteoporosis are formally diagnosed using BMD and T-scores. It is used alongside BMD to provide a comprehensive assessment of bone health." },
  { groupSlug: "lean-pct", displayName: "Lean %", fullName: "Lean %", unit: "%", aliases: ["LEAN %", "LEAN PERCENTAGE", "% LEAN"], summaryTemplate: "Lean % measures the proportion of lean tissue relative to total tissue in {region}. It is measured by DEXA scan and provides insight into body composition by region. Higher lean percentages generally indicate better physical fitness and metabolic health. Comparing lean mass between left and right limbs can help identify muscular asymmetries." },
] as const;

function generateBodyCompEntries(): CanonicalBiomarker[] {
  const entries: CanonicalBiomarker[] = [];
  for (const metric of BODY_COMP_METRICS) {
    for (const region of BODY_COMP_REGIONS) {
      const isTotal = region.name === "Total Body";
      const regionLabel = isTotal ? "the entire body" : `the ${region.name} region`;
      entries.push({
        slug: `${metric.groupSlug}-${region.slugSuffix}`,
        displayName: isTotal ? metric.displayName : `${metric.displayName} (${region.name})`,
        fullName: isTotal ? metric.fullName : `${metric.fullName} (${region.name})`,
        category: "Body Composition",
        defaultUnit: metric.unit,
        summary: metric.summaryTemplate.replace("{region}", regionLabel),
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
  { name: "Head", slugSuffix: "head" },
  { name: "Arms", slugSuffix: "arms" },
  { name: "Legs", slugSuffix: "legs" },
  { name: "Trunk", slugSuffix: "trunk" },
  { name: "Ribs", slugSuffix: "ribs" },
  { name: "Spine", slugSuffix: "spine" },
  { name: "Pelvis", slugSuffix: "pelvis" },
] as const;

const BONE_METRICS = [
  { groupSlug: "bmd", displayName: "BMD", fullName: "Bone Mineral Density", unit: "g/cm\u00B2", aliases: ["BMD", "BONE MINERAL DENSITY"], summaryTemplate: "Bone mineral density (BMD) measures the concentration of minerals in the bones of {region}. It is measured by DEXA scan and is the standard method for diagnosing osteoporosis. Low BMD indicates weakened bones with increased fracture risk. Regular monitoring helps track bone health over time and assess the effectiveness of treatments." },
  { groupSlug: "t-score", displayName: "T-Score", fullName: "T-Score", unit: null, aliases: ["T-SCORE", "T SCORE"], summaryTemplate: "The T-Score compares your bone mineral density to that of a healthy young adult at peak bone mass. A T-Score of -1 or above is considered normal, -1 to -2.5 indicates osteopenia, and at or below -2.5 indicates osteoporosis. It is the standard measurement used to diagnose osteoporosis and assess fracture risk. It is measured by DEXA scan." },
  { groupSlug: "z-score", displayName: "Z-Score", fullName: "Z-Score", unit: null, aliases: ["Z-SCORE", "Z SCORE"], summaryTemplate: "The Z-Score compares your bone mineral density to what is expected for someone of your same age, sex, and ethnicity. Unlike the T-Score, it adjusts for age. A Z-Score of -2.0 or below is considered below the expected range and may suggest an underlying condition affecting bone health. It is particularly useful for evaluating bone density in premenopausal women and younger adults." },
] as const;

function generateBoneEntries(): CanonicalBiomarker[] {
  const entries: CanonicalBiomarker[] = [];
  for (const metric of BONE_METRICS) {
    // T-Score and Z-Score only exist for Total Body (BodySpec shows "-" for regional)
    const regions = metric.groupSlug === "bmd" ? BONE_REGIONS : [BONE_REGIONS[0]];
    for (const region of regions) {
      const isTotal = region.name === "Total Body";
      const regionLabel = isTotal ? "the entire body" : `the ${region.name} region`;
      entries.push({
        slug: `${metric.groupSlug}-${region.slugSuffix}`,
        displayName: isTotal ? metric.displayName : `${metric.displayName} (${region.name})`,
        fullName: isTotal ? metric.fullName : `${metric.fullName} (${region.name})`,
        category: "Bone",
        defaultUnit: metric.unit,
        summary: metric.summaryTemplate.replace("{region}", regionLabel),
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
  // ─── Heart (17) ───
  {
    slug: "total-cholesterol", displayName: "Total Cholesterol", fullName: "Total Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "Total cholesterol measures the overall amount of cholesterol in your blood, including LDL, HDL, and VLDL. It is produced by the liver and also obtained from dietary sources. Elevated total cholesterol is associated with an increased risk of cardiovascular disease, while very low levels may indicate liver dysfunction or malnutrition. It is commonly included in routine lipid panels.",
    aliases: ["CHOLESTEROL TOTAL", "TOTAL CHOLESTEROL", "CHOLESTEROL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hdl-cholesterol", displayName: "HDL Cholesterol", fullName: "HDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "HDL cholesterol, often called \u2018good\u2019 cholesterol, helps remove other forms of cholesterol from your bloodstream. It is produced by the liver and intestines and transports cholesterol back to the liver for disposal. Higher HDL levels are associated with a lower risk of heart disease, while low levels may increase cardiovascular risk. It is routinely measured as part of a standard lipid panel.",
    aliases: ["HDL CHOLESTEROL", "HDL-C", "HDL", "CHOLESTEROL HDL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-cholesterol", displayName: "LDL Cholesterol", fullName: "LDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "LDL cholesterol, often called \u2018bad\u2019 cholesterol, carries cholesterol to your arteries where it can accumulate. It is the primary driver of atherosclerotic plaque buildup in blood vessel walls. Elevated LDL levels significantly increase the risk of heart attack and stroke. It is one of the most important targets for cardiovascular risk reduction.",
    aliases: ["LDL CHOLESTEROL", "LDL-C", "LDL CHOLESTEROL CALC", "LDL CHOL CALC (NIH)", "LDL-CHOLESTEROL"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["total-cholesterol", "hdl-cholesterol", "triglycerides"],
      compute: ([tc, hdl, tg]) => tg >= 400 ? null : tc - hdl - (tg / 5),
      precision: 0,
      formulaDisplay: "Total Cholesterol − HDL − (Triglycerides ÷ 5)",
    },
  },
  {
    slug: "non-hdl-cholesterol", displayName: "Non-HDL Cholesterol", fullName: "Non-HDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "Non-HDL cholesterol represents all cholesterol carried by atherogenic lipoproteins, calculated by subtracting HDL from total cholesterol. It captures LDL, VLDL, IDL, remnant lipoproteins, and Lp(a) in a single number. Elevated non-HDL cholesterol is a strong predictor of cardiovascular disease risk. Many clinicians consider it a more comprehensive risk marker than LDL alone.",
    aliases: ["NON-HDL CHOLESTEROL", "NON HDL CHOLESTEROL"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["total-cholesterol", "hdl-cholesterol"],
      compute: ([tc, hdl]) => tc - hdl,
      precision: 0,
      formulaDisplay: "Total Cholesterol − HDL Cholesterol",
    },
  },
  {
    slug: "triglycerides", displayName: "Triglycerides", fullName: "Triglycerides",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "Triglycerides are the most common type of fat in your body, stored as energy from the food you eat. They are packaged in lipoproteins and transported throughout the body via the bloodstream. Elevated triglycerides are linked to increased risk of heart disease, pancreatitis, and metabolic syndrome. Levels are strongly influenced by diet, alcohol intake, and physical activity.",
    aliases: ["TRIGLYCERIDES", "TRIGLYCERIDE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "apolipoprotein-b", displayName: "Apolipoprotein B", fullName: "Apolipoprotein B",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "Apolipoprotein B (ApoB) is the primary protein on LDL and other atherogenic lipoprotein particles. Each atherogenic particle carries exactly one ApoB molecule, making it a direct count of potentially harmful particles. Elevated ApoB is considered one of the strongest predictors of cardiovascular disease risk. It is increasingly used as a primary target for lipid-lowering therapy.",
    aliases: ["APOLIPOPROTEIN B", "APOLIPOPROTEIN B (APOB)", "APO B", "APOB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lipoprotein-a", displayName: "Lipoprotein(a)", fullName: "Lipoprotein(a)",
    category: "Heart", defaultUnit: "nmol/L",
    summary: "Lipoprotein(a) is a genetically determined lipoprotein particle similar to LDL but with an additional protein called apolipoprotein(a). Its levels are largely set by genetics and remain relatively stable throughout life, though they can be influenced by menopause, kidney disease, and thyroid dysfunction. Elevated Lp(a) is an independent risk factor for heart disease, stroke, and aortic valve disease. It is typically measured at least once to establish baseline cardiovascular risk.",
    aliases: ["LIPOPROTEIN (A)", "LIPOPROTEIN(A)", "LP(A)", "LPA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-particle-number", displayName: "LDL Particle Number", fullName: "LDL Particle Number",
    category: "Heart", defaultUnit: "nmol/L",
    summary: "LDL particle number (LDL-P) measures the total concentration of LDL particles in your blood. Unlike standard LDL cholesterol, which measures cholesterol content, LDL-P counts the actual number of particles. A high particle count can indicate elevated cardiovascular risk even when LDL cholesterol levels appear normal. It is considered a more precise measure of atherogenic risk by some experts.",
    aliases: ["LDL PARTICLE NUMBER", "LDL-P"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "small-ldl-particle-number", displayName: "Small LDL Particle Number", fullName: "Small LDL Particle Number",
    category: "Heart", defaultUnit: "nmol/L",
    summary: "Small LDL particles are a subclass of LDL that are denser and more easily penetrate artery walls. A higher concentration of small LDL particles is associated with increased atherosclerosis risk. This marker is part of advanced lipid testing that goes beyond standard cholesterol panels. Elevated small LDL-P often accompanies insulin resistance and metabolic syndrome.",
    aliases: ["SMALL LDL-P", "SMALL LDL PARTICLE NUMBER", "LDL SMALL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-medium", displayName: "LDL Medium", fullName: "LDL Medium",
    category: "Heart", defaultUnit: "nmol/L",
    summary: "LDL Medium measures the concentration of medium-sized LDL particles in your blood. It is part of advanced lipoprotein subfractionation testing that breaks LDL into size-based categories. Medium LDL particles contribute to atherosclerotic plaque formation alongside other LDL subclasses. This marker helps provide a more detailed picture of cardiovascular risk.",
    aliases: ["LDL MEDIUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hdl-large", displayName: "HDL Large", fullName: "HDL Large",
    category: "Heart", defaultUnit: "nmol/L",
    summary: "HDL Large measures the concentration of large HDL particles in your blood. Large HDL particles are efficient at delivering cholesterol to the liver for excretion, a key step in reverse cholesterol transport. Higher levels of large HDL particles are generally associated with reduced cardiovascular risk, though different HDL subclasses play complementary roles. This marker is part of advanced lipid testing.",
    aliases: ["HDL LARGE", "HDL-LARGE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-pattern", displayName: "LDL Pattern", fullName: "LDL Pattern",
    category: "Heart", defaultUnit: null,
    summary: "LDL Pattern classifies your LDL particles as predominantly large and buoyant (Pattern A) or small and dense (Pattern B). Pattern B, with smaller particles, is associated with a higher risk of cardiovascular disease. This classification is determined through advanced lipoprotein testing. Pattern B is commonly seen with insulin resistance, metabolic syndrome, and high triglycerides.",
    aliases: ["LDL PATTERN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ldl-peak-size", displayName: "LDL Peak Size", fullName: "LDL Peak Size",
    category: "Heart", defaultUnit: "\u00C5",
    summary: "LDL Peak Size measures the diameter of the most prevalent LDL particles in your blood. Larger LDL particles are considered less atherogenic than smaller, denser particles. Smaller LDL peak size is associated with increased cardiovascular risk and insulin resistance. It is measured as part of advanced lipoprotein subfractionation panels.",
    aliases: ["LDL PEAK SIZE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tc-hdl-ratio", displayName: "Total Cholesterol/HDL Ratio", fullName: "Total Cholesterol/HDL Ratio",
    category: "Heart", defaultUnit: null,
    summary: "The Total Cholesterol/HDL ratio compares your total cholesterol to your HDL cholesterol level. It provides a quick snapshot of cardiovascular risk by factoring in both harmful and protective cholesterol. A lower ratio indicates better cardiovascular health, while a higher ratio suggests increased risk. Many clinicians use this ratio as a simple screening tool for heart disease risk.",
    aliases: ["TC/HDL RATIO", "CHOL/HDL RATIO", "CHOLESTEROL/HDL RATIO", "CHOL/HDLC RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["total-cholesterol", "hdl-cholesterol"],
      compute: ([tc, hdl]) => tc / hdl,
      formulaDisplay: "Total Cholesterol ÷ HDL Cholesterol",
    },
  },
  {
    slug: "tg-hdl-ratio", displayName: "Triglycerides/HDL Ratio", fullName: "Triglycerides/HDL Ratio",
    category: "Heart", defaultUnit: null,
    summary: "The Triglycerides/HDL ratio compares triglyceride levels to HDL cholesterol. It is a useful marker for insulin resistance and metabolic syndrome, with higher ratios suggesting greater metabolic dysfunction. This ratio has also been linked to cardiovascular disease risk and small, dense LDL particles. It is easily calculated from a standard lipid panel.",
    aliases: ["TG/HDL RATIO", "TRIGLYCERIDES/HDL RATIO", "TRIG/HDL-C"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["triglycerides", "hdl-cholesterol"],
      compute: ([tg, hdl]) => tg / hdl,
      formulaDisplay: "Triglycerides ÷ HDL Cholesterol",
    },
  },
  {
    slug: "homocysteine", displayName: "Homocysteine", fullName: "Homocysteine",
    category: "Heart", defaultUnit: "\u00B5mol/L",
    summary: "Homocysteine is an amino acid produced during the metabolism of methionine, an essential amino acid from dietary protein. It is normally converted to other substances with the help of B vitamins (B6, B12, and folate). Elevated homocysteine levels are associated with increased risk of cardiovascular disease, blood clots, and cognitive decline. High levels may indicate B vitamin deficiency or genetic variations in methionine metabolism.",
    aliases: ["HOMOCYSTEINE", "HOMOCYSTEINE PLASMA", "HOMOCYST(E)INE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "adiponectin", displayName: "Adiponectin", fullName: "Adiponectin",
    category: "Heart", defaultUnit: "\u00B5g/mL",
    summary: "Adiponectin is a hormone produced by fat cells that helps regulate glucose levels and fatty acid breakdown. Unlike most hormones produced by fat tissue, adiponectin levels decrease as body fat increases. Low adiponectin is associated with insulin resistance, type 2 diabetes, and increased cardiovascular risk. Higher levels are generally considered protective against metabolic and cardiovascular disease.",
    aliases: ["ADIPONECTIN"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },

  // ─── Metabolic (6) ───
  {
    slug: "glucose", displayName: "Glucose", fullName: "Glucose",
    category: "Metabolic", defaultUnit: "mg/dL",
    summary: "Glucose is the primary sugar in your blood and the main source of energy for your body\u2019s cells. It comes from the food you eat and is regulated by the hormone insulin. Elevated fasting glucose levels may indicate prediabetes or diabetes, while very low levels can cause dizziness, confusion, and loss of consciousness. It is one of the most commonly ordered blood tests.",
    aliases: ["GLUCOSE", "GLUCOSE FASTING", "FASTING GLUCOSE", "GLUCOSE SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "hemoglobin-a1c", displayName: "Hemoglobin A1c", fullName: "Hemoglobin A1c",
    category: "Metabolic", defaultUnit: "%",
    summary: "Hemoglobin A1c (HbA1c) measures the percentage of hemoglobin in red blood cells that has glucose attached to it. It reflects your average blood sugar levels over the past 2\u20133 months. Elevated A1c indicates poor blood sugar control and is used to diagnose and monitor diabetes. It is preferred over single glucose readings because it provides a longer-term picture of blood sugar management.",
    aliases: ["HEMOGLOBIN A1C", "HEMOGLOBIN A1C (HBA1C)", "HBA1C", "A1C", "HGB A1C"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "insulin", displayName: "Insulin", fullName: "Insulin",
    category: "Metabolic", defaultUnit: "\u00B5IU/mL",
    summary: "Insulin is a hormone produced by the pancreas that allows cells to absorb glucose from the blood for energy. It plays a central role in regulating blood sugar levels and fat metabolism. Elevated fasting insulin levels can indicate insulin resistance, a precursor to type 2 diabetes. Low insulin may suggest type 1 diabetes or pancreatic dysfunction.",
    aliases: ["INSULIN", "INSULIN FASTING", "FASTING INSULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "uric-acid", displayName: "Uric Acid", fullName: "Uric Acid",
    category: "Metabolic", defaultUnit: "mg/dL",
    summary: "Uric acid is a waste product created when the body breaks down purines, which are found in certain foods and body tissues. It is normally filtered by the kidneys and excreted in urine. Elevated uric acid levels can lead to gout, kidney stones, and are associated with cardiovascular disease and metabolic syndrome. Low levels are uncommon but may be associated with liver disease, certain medications, or renal tubular disorders.",
    aliases: ["URIC ACID"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "amylase", displayName: "Amylase", fullName: "Amylase",
    category: "Metabolic", defaultUnit: "U/L",
    summary: "Amylase is an enzyme produced primarily by the pancreas and salivary glands that helps digest starch into sugars. It is released into the bloodstream during normal pancreatic function. Elevated amylase levels may indicate pancreatitis, salivary gland disorders, or bowel obstruction. It is commonly tested alongside lipase when pancreatic disease is suspected.",
    aliases: ["AMYLASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lipase", displayName: "Lipase", fullName: "Lipase",
    category: "Metabolic", defaultUnit: "U/L",
    summary: "Lipase is an enzyme produced by the pancreas that breaks down dietary fats into fatty acids and glycerol. It is the most specific blood marker for pancreatic function. Elevated lipase levels strongly suggest pancreatitis or other pancreatic disorders. It remains elevated longer than amylase during acute pancreatitis, making it a preferred diagnostic marker.",
    aliases: ["LIPASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Kidney (4) ───
  {
    slug: "blood-urea-nitrogen", displayName: "Blood Urea Nitrogen", fullName: "Blood Urea Nitrogen",
    category: "Kidney", defaultUnit: "mg/dL",
    summary: "Blood urea nitrogen (BUN) measures the amount of nitrogen in your blood from the waste product urea. Urea is produced by the liver when protein is broken down and is eliminated by the kidneys. Elevated BUN may indicate kidney dysfunction, dehydration, or high protein intake, while low levels may suggest liver disease or malnutrition. It is routinely included in metabolic panels.",
    aliases: ["UREA NITROGEN (BUN)", "BUN", "BLOOD UREA NITROGEN", "UREA NITROGEN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "creatinine", displayName: "Creatinine", fullName: "Creatinine",
    category: "Kidney", defaultUnit: "mg/dL",
    summary: "Creatinine is a waste product generated by normal muscle metabolism and filtered out of the blood by the kidneys. It is produced at a relatively constant rate, making it a reliable marker of kidney function. Elevated creatinine levels suggest impaired kidney filtration, while very low levels may reflect reduced muscle mass. It is one of the most commonly used tests to assess kidney health.",
    aliases: ["CREATININE", "CREATININE SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "egfr", displayName: "eGFR", fullName: "Estimated Glomerular Filtration Rate",
    category: "Kidney", defaultUnit: "mL/min/1.73m\u00B2",
    summary: "Estimated glomerular filtration rate (eGFR) calculates how well your kidneys filter waste from the blood, based on creatinine levels, age, and other factors. It is the primary measure used to stage chronic kidney disease. A lower eGFR indicates reduced kidney function, with values below 60 suggesting significant impairment. It is automatically calculated whenever serum creatinine is measured.",
    aliases: ["EGFR", "EGFR IF NONAFRICN AM", "EGFR NON-AFR. AMERICAN", "EGFR IF AFRICAN AM", "GLOMERULAR FILTRATION RATE ESTIMATED", "GFR ESTIMATED", "EGFR (CKD-EPI 2021)", "ESTIMATED GLOMERULAR FILTRATION RATE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "bun-creatinine-ratio", displayName: "BUN/Creatinine Ratio", fullName: "BUN/Creatinine Ratio",
    category: "Kidney", defaultUnit: null,
    summary: "The BUN/Creatinine ratio compares blood urea nitrogen to creatinine levels to help distinguish between different causes of kidney dysfunction. A high ratio may suggest dehydration, gastrointestinal bleeding, or increased protein intake rather than intrinsic kidney disease. A low ratio may indicate liver disease or malnutrition. It is useful for identifying pre-renal causes of elevated kidney markers.",
    aliases: ["BUN/CREATININE RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["blood-urea-nitrogen", "creatinine"],
      compute: ([bun, cr]) => bun / cr,
      formulaDisplay: "BUN ÷ Creatinine",
    },
  },

  // ─── Electrolytes (6) ───
  {
    slug: "sodium", displayName: "Sodium", fullName: "Sodium",
    category: "Electrolytes", defaultUnit: "mmol/L",
    summary: "Sodium is an essential electrolyte that helps regulate fluid balance, nerve function, and muscle contractions. It is primarily obtained from dietary salt and regulated by the kidneys. Abnormal sodium levels can cause neurological symptoms ranging from confusion to seizures. It is part of every basic metabolic panel.",
    aliases: ["SODIUM", "NA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "potassium", displayName: "Potassium", fullName: "Potassium",
    category: "Electrolytes", defaultUnit: "mmol/L",
    summary: "Potassium is an essential electrolyte critical for normal heart rhythm, muscle contraction, and nerve signaling. It is obtained from foods like bananas, potatoes, and leafy greens, and regulated by the kidneys. Both high and low potassium levels can cause dangerous heart rhythm disturbances. It is routinely monitored, especially in patients taking diuretics or heart medications.",
    aliases: ["POTASSIUM", "K"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "chloride", displayName: "Chloride", fullName: "Chloride",
    category: "Electrolytes", defaultUnit: "mmol/L",
    summary: "Chloride is an electrolyte that works closely with sodium and bicarbonate to maintain fluid balance and acid-base equilibrium. It is primarily obtained from dietary salt and regulated by the kidneys. Abnormal chloride levels often accompany changes in sodium or bicarbonate and can indicate dehydration, kidney disease, or acid-base disorders. It is included in standard metabolic panels.",
    aliases: ["CHLORIDE", "CL"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "carbon-dioxide", displayName: "Carbon Dioxide", fullName: "Carbon Dioxide",
    category: "Electrolytes", defaultUnit: "mmol/L",
    summary: "Carbon dioxide (CO2) in blood, measured as bicarbonate, reflects your body\u2019s acid-base balance. It is a key component of the buffer system that maintains blood pH within a narrow range. Low levels may indicate metabolic acidosis from kidney disease or diabetic ketoacidosis, while high levels may suggest metabolic alkalosis. It is routinely measured as part of basic metabolic panels.",
    aliases: ["CARBON DIOXIDE TOTAL", "CO2", "CARBON DIOXIDE", "CO2 TOTAL", "BICARBONATE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "calcium", displayName: "Calcium", fullName: "Calcium",
    category: "Electrolytes", defaultUnit: "mg/dL",
    summary: "Calcium is an essential mineral vital for bone strength, muscle contraction, nerve signaling, and blood clotting. Most calcium is stored in bones, with a small fraction circulating in the blood. Abnormal blood calcium levels can cause muscle cramps, heart rhythm issues, and neurological symptoms. It is regulated by parathyroid hormone and vitamin D, and is part of standard metabolic panels.",
    aliases: ["CALCIUM", "CA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "magnesium-rbc", displayName: "Magnesium RBC", fullName: "Magnesium RBC",
    category: "Electrolytes", defaultUnit: "mg/dL",
    summary: "Magnesium RBC measures the concentration of magnesium inside red blood cells, providing a more accurate picture of cellular magnesium status than serum levels. Magnesium is essential for over 300 enzymatic reactions, including energy production, muscle function, and nerve signaling. Low intracellular magnesium is associated with muscle cramps, fatigue, and cardiovascular issues. This test is preferred by some practitioners as it reflects tissue magnesium levels more accurately.",
    aliases: ["MAGNESIUM RBC", "MAGNESIUM RED BLOOD CELL", "RBC MAGNESIUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Proteins (4) ───
  {
    slug: "total-protein", displayName: "Total Protein", fullName: "Total Protein",
    category: "Proteins", defaultUnit: "g/dL",
    summary: "Total protein measures the combined amount of albumin and globulin in your blood. These proteins perform vital functions including transporting substances, fighting infections, and maintaining fluid balance. Abnormal levels can indicate liver disease, kidney disease, nutritional deficiencies, or immune disorders. It is routinely included in comprehensive metabolic panels.",
    aliases: ["PROTEIN", "PROTEIN TOTAL", "TOTAL PROTEIN"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "albumin", displayName: "Albumin", fullName: "Albumin",
    category: "Proteins", defaultUnit: "g/dL",
    summary: "Albumin is the most abundant protein in blood plasma, produced by the liver. It maintains fluid balance by keeping blood in the vessels and transports hormones, vitamins, and medications. Low albumin levels may indicate liver disease, kidney disease, malnutrition, or chronic inflammation. It is widely used as a marker of overall nutritional status and liver function.",
    aliases: ["ALBUMIN", "ALBUMIN SERUM"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "globulin", displayName: "Globulin", fullName: "Globulin",
    category: "Proteins", defaultUnit: "g/dL",
    summary: "Globulin is a group of proteins in the blood that includes antibodies and other proteins involved in immune function and transport. It is calculated by subtracting albumin from total protein. Elevated globulin levels may indicate chronic infections, liver disease, or autoimmune conditions, while low levels may suggest immune deficiency. It provides a general overview of immune system activity.",
    aliases: ["GLOBULIN TOTAL", "GLOBULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["total-protein", "albumin"],
      compute: ([tp, alb]) => tp - alb,
      precision: 1,
      formulaDisplay: "Total Protein − Albumin",
    },
  },
  {
    slug: "ag-ratio", displayName: "Albumin/Globulin Ratio", fullName: "Albumin/Globulin Ratio",
    category: "Proteins", defaultUnit: null,
    summary: "The Albumin/Globulin (A/G) ratio compares the levels of albumin to globulin proteins in your blood. It helps identify protein imbalances that may indicate underlying disease. A low ratio may suggest overproduction of globulins (as in autoimmune disease or multiple myeloma) or reduced albumin production (as in liver disease). It is useful as a screening tool alongside individual protein measurements.",
    aliases: ["A/G RATIO", "ALBUMIN/GLOBULIN RATIO"],
    region: null, regionGroupSlug: null, specimenType: "blood",
    derivative: {
      components: ["albumin", "globulin"],
      compute: ([alb, glob]) => alb / glob,
      formulaDisplay: "Albumin ÷ Globulin",
    },
  },

  // ─── Liver (5) ───
  {
    slug: "bilirubin-total", displayName: "Bilirubin Total", fullName: "Bilirubin Total",
    category: "Liver", defaultUnit: "mg/dL",
    summary: "Bilirubin is a yellow pigment produced when red blood cells are broken down, processed by the liver, and excreted in bile. It gives bile and stool their characteristic colors. Elevated bilirubin causes jaundice (yellowing of skin and eyes) and may indicate liver disease, bile duct obstruction, or excessive red blood cell destruction. It is part of standard liver function panels.",
    aliases: ["BILIRUBIN TOTAL", "BILIRUBIN", "TOTAL BILIRUBIN"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "alkaline-phosphatase", displayName: "Alkaline Phosphatase", fullName: "Alkaline Phosphatase",
    category: "Liver", defaultUnit: "U/L",
    summary: "Alkaline phosphatase (ALP) is an enzyme found throughout the body, with highest concentrations in the liver, bile ducts, and bone. It removes phosphate groups from various molecules, though its exact physiological functions are not fully understood. Elevated levels may indicate liver disease, bile duct obstruction, or bone disorders. It is routinely included in comprehensive metabolic panels.",
    aliases: ["ALKALINE PHOSPHATASE", "ALK PHOSPHATASE", "ALP"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ast", displayName: "AST", fullName: "Aspartate Aminotransferase",
    category: "Liver", defaultUnit: "U/L",
    summary: "AST (aspartate aminotransferase) is an enzyme found in the liver, heart, muscles, and other tissues. It is released into the bloodstream when these cells are damaged. Elevated AST levels often indicate liver damage but can also result from heart attack, muscle injury, or strenuous exercise. It is commonly measured alongside ALT to assess liver health.",
    aliases: ["AST (SGOT)", "AST", "SGOT", "ASPARTATE AMINOTRANSFERASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "alt", displayName: "ALT", fullName: "Alanine Aminotransferase",
    category: "Liver", defaultUnit: "U/L",
    summary: "ALT (alanine aminotransferase) is an enzyme primarily found in the liver, making it the most specific routine marker for liver cell damage. It is released into the bloodstream when liver cells are injured or inflamed. Elevated ALT levels are commonly caused by fatty liver disease, hepatitis, medications, or alcohol use. It is considered the most liver-specific of the standard liver enzymes.",
    aliases: ["ALT (SGPT)", "ALT", "SGPT", "ALANINE AMINOTRANSFERASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ggt", displayName: "GGT", fullName: "Gamma-Glutamyl Transferase",
    category: "Liver", defaultUnit: "U/L",
    summary: "GGT (gamma-glutamyl transferase) is an enzyme found mainly in the liver and bile ducts. It plays a key role in glutathione metabolism and helps maintain cellular antioxidant defense. Elevated GGT levels may indicate liver disease, bile duct problems, or heavy alcohol use, and it is one of the most sensitive markers for alcohol-related liver damage. It is often tested to help distinguish the cause of elevated alkaline phosphatase.",
    aliases: ["GGT", "GAMMA-GLUTAMYL TRANSFERASE", "GAMMA GLUTAMYL TRANSPEPTIDASE", "GAMMA-GLUTAMYL TRANSPEPTIDASE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Iron (4) ───
  {
    slug: "iron-total", displayName: "Iron Total", fullName: "Iron Total",
    category: "Iron", defaultUnit: "\u00B5g/dL",
    summary: "Iron is an essential mineral that the body uses to make hemoglobin, the protein in red blood cells that carries oxygen. It is obtained from dietary sources and recycled from old red blood cells. Low iron levels can lead to iron-deficiency anemia, causing fatigue and weakness, while excessively high levels can damage organs. It is typically measured as part of an iron panel.",
    aliases: ["IRON TOTAL", "IRON", "IRON SERUM", "FE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tibc", displayName: "Total Iron Binding Capacity", fullName: "Total Iron Binding Capacity",
    category: "Iron", defaultUnit: "\u00B5g/dL",
    summary: "Total iron binding capacity (TIBC) measures the maximum amount of iron that the blood\u2019s transport proteins (transferrin) can carry. It indicates the blood\u2019s capacity to bind and transport iron throughout the body. TIBC rises when iron stores are depleted and decreases when iron is abundant. It is used alongside serum iron and ferritin to evaluate iron deficiency, iron overload, and anemia.",
    aliases: ["IRON BIND.CAP.(TIBC)", "TIBC", "TOTAL IRON BINDING CAPACITY", "IRON BINDING CAPACITY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "iron-saturation", displayName: "Iron Saturation", fullName: "Iron Saturation",
    category: "Iron", defaultUnit: "%",
    summary: "Iron saturation (transferrin saturation) represents the percentage of iron-binding sites on transferrin that are occupied by iron. It is calculated from serum iron and TIBC. Low saturation suggests iron deficiency, while very high saturation may indicate iron overload conditions like hemochromatosis. It helps distinguish between different types of anemia and iron disorders.",
    aliases: ["IRON SATURATION", "% SATURATION", "IRON % SATURATION"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["iron-total", "tibc"],
      compute: ([fe, tibc]) => (fe / tibc) * 100,
      precision: 0,
      formulaDisplay: "(Iron ÷ TIBC) × 100",
    },
  },
  {
    slug: "ferritin", displayName: "Ferritin", fullName: "Ferritin",
    category: "Iron", defaultUnit: "ng/mL",
    summary: "Ferritin is a protein that stores iron in your cells and releases it when needed. Blood ferritin levels reflect the body\u2019s total iron stores. Low ferritin is the earliest indicator of iron depletion and may signal iron-deficiency anemia, while elevated ferritin can indicate iron overload, inflammation, or liver disease. It is the most useful single test for assessing iron stores.",
    aliases: ["FERRITIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── CBC (20) ───
  {
    slug: "wbc", displayName: "White Blood Cell Count", fullName: "White Blood Cell Count",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "White blood cells (WBCs) are immune cells that defend the body against infections and foreign invaders. They are produced in bone marrow and circulate through the blood and tissues. Elevated WBC counts typically indicate infection, inflammation, or stress, while low counts may suggest bone marrow problems or immune suppression. WBC count is a fundamental part of the complete blood count.",
    aliases: ["WBC", "WHITE BLOOD CELL COUNT", "WHITE BLOOD CELLS"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "rbc", displayName: "Red Blood Cell Count", fullName: "Red Blood Cell Count",
    category: "CBC", defaultUnit: "x10\u2076/\u00B5L",
    summary: "Red blood cells (RBCs) are the most abundant cells in blood, responsible for carrying oxygen from the lungs to all body tissues. They contain hemoglobin, the protein that binds oxygen. Low RBC counts indicate anemia, which can cause fatigue and shortness of breath, while high counts may suggest dehydration or polycythemia. It is a key component of the complete blood count.",
    aliases: ["RBC", "RED BLOOD CELL COUNT", "RED BLOOD CELLS"],
    region: null, regionGroupSlug: null, specimenType: "blood",
  },
  {
    slug: "hemoglobin", displayName: "Hemoglobin", fullName: "Hemoglobin",
    category: "CBC", defaultUnit: "g/dL",
    summary: "Hemoglobin is the iron-containing protein in red blood cells that carries oxygen to tissues and returns carbon dioxide to the lungs. It gives blood its red color. Low hemoglobin indicates anemia and can cause fatigue, weakness, and shortness of breath, while high levels may suggest dehydration or polycythemia. It is one of the most commonly used measures of blood health.",
    aliases: ["HEMOGLOBIN", "HGB", "HB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "hematocrit", displayName: "Hematocrit", fullName: "Hematocrit",
    category: "CBC", defaultUnit: "%",
    summary: "Hematocrit measures the percentage of your blood volume that is made up of red blood cells. It provides a quick assessment of your blood\u2019s oxygen-carrying capacity. Low hematocrit indicates anemia, while elevated levels may suggest dehydration or polycythemia. It closely parallels hemoglobin levels and is part of every complete blood count.",
    aliases: ["HEMATOCRIT", "HCT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mcv", displayName: "MCV", fullName: "Mean Corpuscular Volume",
    category: "CBC", defaultUnit: "fL",
    summary: "Mean corpuscular volume (MCV) measures the average size of your red blood cells. It is calculated from hematocrit and red blood cell count. Large red blood cells (high MCV) may indicate vitamin B12 or folate deficiency, while small cells (low MCV) often suggest iron deficiency. MCV is essential for classifying the type of anemia.",
    aliases: ["MCV", "MEAN CORPUSCULAR VOLUME"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mch", displayName: "MCH", fullName: "Mean Corpuscular Hemoglobin",
    category: "CBC", defaultUnit: "pg",
    summary: "Mean corpuscular hemoglobin (MCH) measures the average amount of hemoglobin in each red blood cell. It reflects how much oxygen each cell can carry. Low MCH typically accompanies iron deficiency anemia, while high MCH is seen with vitamin B12 or folate deficiency. It is part of the complete blood count and is used alongside MCV to characterize anemias.",
    aliases: ["MCH", "MEAN CORPUSCULAR HEMOGLOBIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mchc", displayName: "MCHC", fullName: "Mean Corpuscular Hemoglobin Concentration",
    category: "CBC", defaultUnit: "g/dL",
    summary: "Mean corpuscular hemoglobin concentration (MCHC) measures the average concentration of hemoglobin within red blood cells. It indicates how densely packed hemoglobin is in each cell. Low MCHC suggests iron deficiency, while high MCHC can indicate hereditary spherocytosis or other red cell disorders. It is used to further classify anemias identified by other CBC markers.",
    aliases: ["MCHC", "MEAN CORPUSCULAR HB CONC", "MEAN CORPUSCULAR HEMOGLOBIN CONCENTRATION"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rdw", displayName: "RDW", fullName: "Red Cell Distribution Width",
    category: "CBC", defaultUnit: "%",
    summary: "Red cell distribution width (RDW) measures the variation in size among your red blood cells. A normal RDW means cells are relatively uniform in size. Elevated RDW indicates greater size variation, which can suggest iron deficiency, vitamin B12 or folate deficiency, or mixed anemias. It is useful for distinguishing between different types of anemia when used alongside MCV.",
    aliases: ["RDW", "RED CELL DISTRIBUTION WIDTH", "RDW-CV"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "platelets", displayName: "Platelets", fullName: "Platelets",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Platelets are small cell fragments in the blood essential for clotting and wound healing. They are produced in the bone marrow and normally circulate for 7 to 10 days. Low platelet counts increase bleeding risk, while high counts may raise the risk of blood clots. Platelet count is routinely measured as part of the complete blood count.",
    aliases: ["PLATELET COUNT", "PLATELETS", "PLT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mpv", displayName: "MPV", fullName: "Mean Platelet Volume",
    category: "CBC", defaultUnit: "fL",
    summary: "Mean platelet volume (MPV) measures the average size of your platelets. Larger platelets tend to be younger and more metabolically active. Elevated MPV may indicate increased platelet production, often seen with platelet destruction or inflammation, while low MPV may suggest bone marrow suppression. It provides additional context when interpreting platelet counts.",
    aliases: ["MPV", "MEAN PLATELET VOLUME"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "neutrophils-absolute", displayName: "Neutrophils Absolute", fullName: "Neutrophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Neutrophils are the most abundant type of white blood cell and serve as the first line of defense against bacterial infections. They engulf and destroy bacteria and fungi through phagocytosis. Elevated neutrophils typically indicate bacterial infection, inflammation, or physical stress, while low counts increase susceptibility to infections. They normally make up 40\u201360% of total white blood cells.",
    aliases: ["NEUTROPHILS (ABSOLUTE)", "NEUTROPHILS ABS", "ABSOLUTE NEUTROPHILS", "ABS NEUTROPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lymphocytes-absolute", displayName: "Lymphocytes Absolute", fullName: "Lymphocytes Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Lymphocytes are white blood cells central to immune defense, including T cells and B cells of the adaptive immune system and natural killer cells of the innate immune system. They are responsible for recognizing specific pathogens, producing antibodies, and forming immune memory. Elevated lymphocytes may indicate viral infections, while low counts can suggest immune deficiency. They typically make up 20\u201340% of total white blood cells.",
    aliases: ["LYMPHOCYTES (ABSOLUTE)", "LYMPHOCYTES ABS", "LYMPHS (ABSOLUTE)", "ABSOLUTE LYMPHOCYTES", "ABS LYMPHOCYTES"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "monocytes-absolute", displayName: "Monocytes Absolute", fullName: "Monocytes Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Monocytes are the largest type of white blood cell and play a key role in the immune response by engulfing pathogens and dead cells. They circulate in the blood before migrating into tissues where they become macrophages. Elevated monocytes may indicate chronic infections, autoimmune disorders, or blood cancers. They normally make up 2\u20138% of total white blood cells.",
    aliases: ["MONOCYTES (ABSOLUTE)", "MONOCYTES ABS", "MONOCYTES(ABSOLUTE)", "ABSOLUTE MONOCYTES", "ABS MONOCYTES"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "eosinophils-absolute", displayName: "Eosinophils Absolute", fullName: "Eosinophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Eosinophils are white blood cells involved in combating parasitic infections and mediating allergic reactions. They release toxic granules that destroy parasites and modulate inflammatory responses. Elevated eosinophils typically indicate allergic conditions, parasitic infections, or eosinophilic disorders. They normally make up 1\u20134% of total white blood cells.",
    aliases: ["EOSINOPHILS (ABSOLUTE)", "EOS (ABSOLUTE)", "ABSOLUTE EOSINOPHILS", "ABS EOSINOPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "basophils-absolute", displayName: "Basophils Absolute", fullName: "Basophils Absolute",
    category: "CBC", defaultUnit: "x10\u00B3/\u00B5L",
    summary: "Basophils are the rarest type of white blood cell, involved in allergic reactions and inflammatory responses. They release histamine and heparin, contributing to the body\u2019s immune and inflammatory processes. Elevated basophils may be associated with allergic reactions, chronic inflammation, or certain blood cancers. They normally make up less than 1% of total white blood cells.",
    aliases: ["BASOPHILS (ABSOLUTE)", "BASO (ABSOLUTE)", "ABSOLUTE BASOPHILS", "ABS BASOPHILS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "neutrophils-pct", displayName: "Neutrophils %", fullName: "Neutrophils %",
    category: "CBC", defaultUnit: "%",
    summary: "Neutrophils % represents the proportion of white blood cells that are neutrophils, the primary defense against bacterial infections. A high percentage often indicates bacterial infection or acute inflammation, while a low percentage may suggest increased lymphocytes from viral infection or bone marrow issues. It is used alongside absolute counts to evaluate the immune response.",
    aliases: ["NEUTROPHILS", "NEUTROPHILS %"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lymphocytes-pct", displayName: "Lymphocytes %", fullName: "Lymphocytes %",
    category: "CBC", defaultUnit: "%",
    summary: "Lymphocytes % represents the proportion of white blood cells that are lymphocytes, including T cells, B cells, and natural killer cells. A high percentage often indicates viral infection, while a low percentage may suggest immune suppression. It is most informative when interpreted alongside absolute lymphocyte counts.",
    aliases: ["LYMPHOCYTES", "LYMPHOCYTES %", "LYMPHS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "monocytes-pct", displayName: "Monocytes %", fullName: "Monocytes %",
    category: "CBC", defaultUnit: "%",
    summary: "Monocytes % represents the proportion of white blood cells that are monocytes, which serve as scavenger cells that engulf pathogens and debris. An elevated percentage may indicate chronic infection or inflammatory conditions. It is typically interpreted alongside absolute monocyte counts and other white blood cell differentials.",
    aliases: ["MONOCYTES", "MONOCYTES %"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "eosinophils-pct", displayName: "Eosinophils %", fullName: "Eosinophils %",
    category: "CBC", defaultUnit: "%",
    summary: "Eosinophils % represents the proportion of white blood cells that are eosinophils, which specialize in fighting parasites and mediating allergic responses. An elevated percentage commonly indicates allergic conditions, asthma, or parasitic infections. It is used alongside absolute counts and is part of the standard white blood cell differential.",
    aliases: ["EOSINOPHILS", "EOSINOPHILS %", "EOS"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "basophils-pct", displayName: "Basophils %", fullName: "Basophils %",
    category: "CBC", defaultUnit: "%",
    summary: "Basophils % represents the proportion of white blood cells that are basophils, the rarest white blood cells that participate in allergic and inflammatory reactions. An elevated percentage is uncommon and may be seen with certain blood cancers or allergic conditions. It is part of the standard white blood cell differential.",
    aliases: ["BASOPHILS", "BASOPHILS %", "BASO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Inflammation (1) ───
  {
    slug: "hs-crp", displayName: "High-Sensitivity C-Reactive Protein", fullName: "High-Sensitivity C-Reactive Protein",
    category: "Inflammation", defaultUnit: "mg/L",
    summary: "High-sensitivity C-reactive protein (hs-CRP) measures low levels of CRP, a protein produced by the liver in response to inflammation. Unlike standard CRP tests, hs-CRP can detect the subtle chronic inflammation associated with cardiovascular disease. Elevated hs-CRP levels are associated with increased risk of heart attack and stroke. It is widely used to assess cardiovascular risk, especially in combination with cholesterol testing.",
    aliases: ["HS-CRP", "HS CRP", "HSCRP", "C-REACTIVE PROTEIN CARDIAC", "HIGH SENSITIVITY C-REACTIVE PROTEIN", "HIGH-SENSITIVITY C-REACTIVE PROTEIN", "CRP HIGH SENSITIVITY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Thyroid (5) ───
  {
    slug: "tsh", displayName: "TSH", fullName: "Thyroid Stimulating Hormone",
    category: "Thyroid", defaultUnit: "\u00B5IU/mL",
    summary: "Thyroid stimulating hormone (TSH) is produced by the pituitary gland and controls how much thyroid hormone the thyroid gland releases. It is the primary screening test for thyroid function. Elevated TSH indicates an underactive thyroid (hypothyroidism), while low TSH suggests an overactive thyroid (hyperthyroidism). It is the most sensitive single marker for detecting thyroid disorders.",
    aliases: ["TSH", "THYROID STIMULATING HORMONE", "THYROTROPIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "free-t4", displayName: "Free T4", fullName: "Free Thyroxine",
    category: "Thyroid", defaultUnit: "ng/dL",
    summary: "Free T4 (thyroxine) is the unbound form of the main hormone produced by the thyroid gland. It circulates in the blood and is converted to T3, the biologically active thyroid hormone, in tissues. Low free T4 with high TSH confirms hypothyroidism, while high free T4 with low TSH confirms hyperthyroidism. It is measured alongside TSH to evaluate thyroid function.",
    aliases: ["FREE T4", "T4 FREE", "T4FREE(DIRECT)", "THYROXINE (T4) FREE DIRECT", "FREE THYROXINE", "T4 FREE (DIRECT)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "free-t3", displayName: "Free T3", fullName: "Free Triiodothyronine",
    category: "Thyroid", defaultUnit: "pg/mL",
    summary: "Free T3 (triiodothyronine) is the unbound, active form of the most potent thyroid hormone. Most T3 is produced by converting T4 in peripheral tissues rather than directly by the thyroid. Elevated free T3 can indicate hyperthyroidism, while low levels may suggest hypothyroidism or poor T4-to-T3 conversion. It is particularly useful in diagnosing T3 thyrotoxicosis, where T3 is elevated but T4 is normal.",
    aliases: ["FREE T3", "T3 FREE", "TRIIODOTHYRONINE (T3) FREE", "FREE TRIIODOTHYRONINE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "thyroglobulin-antibody", displayName: "Thyroglobulin Antibody", fullName: "Thyroglobulin Antibody",
    category: "Thyroid", defaultUnit: "IU/mL",
    summary: "Thyroglobulin antibodies are autoantibodies directed against thyroglobulin, a protein used by the thyroid to produce hormones. Their presence indicates an autoimmune process targeting the thyroid gland. Elevated levels are commonly found in Hashimoto\u2019s thyroiditis and Graves\u2019 disease. They are often tested alongside TPO antibodies to evaluate autoimmune thyroid conditions.",
    aliases: ["THYROGLOBULIN ANTIBODIES", "THYROGLOBULIN ANTIBODY", "THYROGLOBULIN AB", "ANTI-THYROGLOBULIN AB"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "tpo-antibody", displayName: "TPO Antibody", fullName: "Thyroid Peroxidase Antibody",
    category: "Thyroid", defaultUnit: "IU/mL",
    summary: "Thyroid peroxidase (TPO) antibodies target the enzyme essential for thyroid hormone production. They are the most common antibody found in autoimmune thyroid disease. Elevated TPO antibodies are strongly associated with Hashimoto\u2019s thyroiditis and predict increased risk of developing hypothyroidism. They are also found in some cases of Graves\u2019 disease.",
    aliases: ["THYROID PEROXIDASE (TPO) AB", "TPO AB", "TPO ANTIBODY", "THYROID PEROXIDASE ANTIBODIES", "ANTI-TPO", "THYROID PEROXIDASE ANTIBODY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Endocrinology (10) ───
  {
    slug: "testosterone-total", displayName: "Testosterone Total", fullName: "Testosterone Total",
    category: "Endocrinology", defaultUnit: "ng/dL",
    summary: "Total testosterone measures the combined free and protein-bound testosterone in the blood. It is the primary male sex hormone, produced mainly in the testes in men and in smaller amounts by the ovaries and adrenal glands in women. Low levels in men can cause fatigue, reduced muscle mass, and low libido, while high levels in women may indicate polycystic ovary syndrome. It is commonly tested to evaluate hormonal health and fertility.",
    aliases: ["TESTOSTERONE TOTAL", "TESTOSTERONE", "TOTAL TESTOSTERONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "testosterone-free", displayName: "Testosterone Free", fullName: "Testosterone Free",
    category: "Endocrinology", defaultUnit: "pg/mL",
    summary: "Free testosterone measures the small fraction of testosterone not bound to proteins, representing the biologically active form. Only about 2\u20133% of total testosterone circulates freely. Low free testosterone can cause symptoms even when total testosterone is normal, including fatigue, decreased libido, and mood changes. It provides a more accurate picture of testosterone activity, especially when binding protein levels are abnormal.",
    aliases: ["FREE TESTOSTERONE(DIRECT)", "FREE TESTOSTERONE", "TESTOSTERONE FREE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dhea-s", displayName: "DHEA-Sulfate", fullName: "Dehydroepiandrosterone Sulfate",
    category: "Endocrinology", defaultUnit: "\u00B5g/dL",
    summary: "DHEA-Sulfate (DHEA-S) is a hormone produced by the adrenal glands that serves as a precursor to both testosterone and estrogen. It is the most abundant steroid hormone in the body and declines steadily with age. Low levels may indicate adrenal insufficiency, while elevated levels can suggest adrenal tumors or polycystic ovary syndrome. It is used to evaluate adrenal gland function.",
    aliases: ["DHEA-SULFATE", "DHEA SULFATE", "DEHYDROEPIANDROSTERONE SULFATE", "DHEA-S"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "fsh", displayName: "FSH", fullName: "Follicle Stimulating Hormone",
    category: "Endocrinology", defaultUnit: "mIU/mL",
    summary: "Follicle stimulating hormone (FSH) is produced by the pituitary gland and plays a key role in reproductive function. In women, it stimulates egg development in the ovaries; in men, it supports sperm production. Elevated FSH may indicate menopause, ovarian failure, or testicular failure, while low levels can suggest pituitary disorders. It is commonly tested as part of fertility evaluations.",
    aliases: ["FSH", "FOLLICLE STIMULATING HORMONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "lh", displayName: "LH", fullName: "Luteinizing Hormone",
    category: "Endocrinology", defaultUnit: "mIU/mL",
    summary: "Luteinizing hormone (LH) is produced by the pituitary gland and is essential for reproductive function. In women, an LH surge triggers ovulation; in men, it stimulates testosterone production. Elevated LH may indicate menopause, ovarian failure, or polycystic ovary syndrome, while low levels suggest pituitary dysfunction. It is commonly tested alongside FSH in fertility and hormonal evaluations.",
    aliases: ["LH", "LUTEINIZING HORMONE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "prolactin", displayName: "Prolactin", fullName: "Prolactin",
    category: "Endocrinology", defaultUnit: "ng/mL",
    summary: "Prolactin is a hormone produced by the pituitary gland, best known for its role in stimulating breast milk production. It also influences reproductive function and immune regulation. Elevated prolactin can cause irregular periods, infertility, and galactorrhea, and may indicate a pituitary adenoma. It is commonly tested when reproductive or pituitary disorders are suspected.",
    aliases: ["PROLACTIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "shbg", displayName: "SHBG", fullName: "Sex Hormone Binding Globulin",
    category: "Endocrinology", defaultUnit: "nmol/L",
    summary: "Sex hormone binding globulin (SHBG) is a protein produced by the liver that binds to and transports sex hormones, including testosterone and estrogen. It regulates how much of these hormones is available for use by tissues. High SHBG reduces free testosterone availability, while low SHBG increases it. Levels are affected by thyroid function, liver health, obesity, and insulin resistance.",
    aliases: ["SHBG", "SEX HORM BINDING GLOB", "SEX HORMONE BINDING GLOBULIN", "SEX HORM BINDING GLOBULIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "estradiol", displayName: "Estradiol", fullName: "Estradiol",
    category: "Endocrinology", defaultUnit: "pg/mL",
    summary: "Estradiol is the most potent form of estrogen, the primary female sex hormone. It is produced mainly by the ovaries in women and in smaller amounts by the adrenal glands and testes in men. In women, it regulates the menstrual cycle, fertility, and bone health. Levels are used to assess ovarian function, menopausal status, and hormonal balance.",
    aliases: ["ESTRADIOL", "ESTRADIOL E2"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "cortisol", displayName: "Cortisol", fullName: "Cortisol",
    category: "Endocrinology", defaultUnit: "\u00B5g/dL",
    summary: "Cortisol is a steroid hormone produced by the adrenal glands in response to stress and low blood sugar. It plays essential roles in metabolism, immune function, and the body\u2019s stress response. Elevated cortisol may indicate Cushing\u2019s syndrome or chronic stress, while low levels can suggest adrenal insufficiency (Addison\u2019s disease). Morning cortisol levels are most commonly tested as cortisol follows a daily rhythm.",
    aliases: ["CORTISOL", "CORTISOL TOTAL", "CORTISOL AM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "leptin", displayName: "Leptin", fullName: "Leptin",
    category: "Endocrinology", defaultUnit: "ng/mL",
    summary: "Leptin is a hormone produced by fat cells that signals satiety to the brain, helping regulate appetite and energy balance. Higher body fat leads to more leptin production, but obese individuals often develop leptin resistance, where the brain stops responding to the signal. Elevated leptin with continued hunger suggests leptin resistance, which is associated with obesity and metabolic dysfunction. Low leptin is rare and can cause extreme hunger.",
    aliases: ["LEPTIN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Fatty Acids (10) ───
  {
    slug: "epa", displayName: "EPA", fullName: "Eicosapentaenoic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "EPA (eicosapentaenoic acid) is an omega-3 fatty acid found primarily in fatty fish and fish oil supplements. It is measured as a percentage of total fatty acids in red blood cell membranes. Higher EPA levels are associated with reduced inflammation and lower cardiovascular risk. It is part of comprehensive fatty acid testing that evaluates omega-3 status.",
    aliases: ["EPA", "EICOSAPENTAENOIC ACID", "EICOSAPENTAENOIC (EPA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dpa", displayName: "DPA", fullName: "Docosapentaenoic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "DPA (docosapentaenoic acid) is an omega-3 fatty acid that serves as an intermediary between EPA and DHA in the omega-3 metabolic pathway. It is found in fatty fish and is measured as a percentage of total fatty acids. DPA contributes to anti-inflammatory and cardiovascular benefits alongside EPA and DHA. It is included in comprehensive fatty acid panels.",
    aliases: ["DPA", "DOCOSAPENTAENOIC ACID", "DOCOSAPENTAENOIC (DPA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "dha", displayName: "DHA", fullName: "Docosahexaenoic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "DHA (docosahexaenoic acid) is an omega-3 fatty acid that is a major structural component of the brain and retina. It is found in fatty fish and algae and is measured as a percentage of total fatty acids. Higher DHA levels are associated with better brain health, reduced inflammation, and lower cardiovascular risk. It is essential during pregnancy for fetal brain development.",
    aliases: ["DHA", "DOCOSAHEXAENOIC ACID", "DOCOSAHEXAENOIC (DHA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "epa-dpa-dha", displayName: "EPA+DPA+DHA", fullName: "Eicosapentaenoic + Docosapentaenoic + Docosahexaenoic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "The EPA+DPA+DHA index measures the combined omega-3 fatty acids in red blood cell membranes as a percentage of total fatty acids. It provides a comprehensive view of overall omega-3 status and correlates with cardiovascular risk. Higher values indicate better omega-3 status and are associated with reduced risk of heart disease. It is part of comprehensive fatty acid panels that assess omega-3 sufficiency.",
    aliases: ["EPA+DPA+DHA", "EPA + DPA + DHA", "OMEGA-3 INDEX (EPA+DPA+DHA)", "OMEGA-3 INDEX", "OMEGA 3 INDEX"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["epa", "dpa", "dha"],
      compute: ([a, b, c]) => a + b + c,
      formulaDisplay: "EPA + DPA + DHA",
    },
  },
  {
    slug: "omega-3-total", displayName: "Omega-3 Total", fullName: "Omega-3 Total",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "Omega-3 Total measures the total percentage of all omega-3 fatty acids in red blood cell membranes. Omega-3s are essential fats that the body cannot produce and must be obtained from diet. Higher total omega-3 levels are associated with reduced inflammation, better cardiovascular health, and improved brain function. Sources include fatty fish, walnuts, flaxseed, and supplements.",
    aliases: ["OMEGA-3 TOTAL", "OMEGA 3 TOTAL", "TOTAL OMEGA-3"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "omega-6-total", displayName: "Omega-6 Total", fullName: "Omega-6 Total",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "Omega-6 Total measures the total percentage of all omega-6 fatty acids in red blood cell membranes. Omega-6 fatty acids are essential fats found in vegetable oils, nuts, and seeds. While necessary for health, excessive omega-6 relative to omega-3 may promote inflammation. Most Western diets provide adequate or excessive omega-6 fatty acids.",
    aliases: ["OMEGA-6 TOTAL", "OMEGA 6 TOTAL", "TOTAL OMEGA-6"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "arachidonic-acid", displayName: "Arachidonic Acid", fullName: "Arachidonic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "Arachidonic acid (AA) is an omega-6 fatty acid that serves as both a structural component of cell membranes and a precursor to inflammatory signaling molecules. It is found in meat, eggs, and dairy products. Elevated arachidonic acid relative to EPA can promote inflammation, while balanced levels support normal immune function. It is measured as part of comprehensive fatty acid testing.",
    aliases: ["ARACHIDONIC ACID", "ARACHIDONIC (AA)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "linoleic-acid", displayName: "Linoleic Acid", fullName: "Linoleic Acid",
    category: "Fatty Acids", defaultUnit: "%",
    summary: "Linoleic acid is the most abundant omega-6 fatty acid in the diet and an essential fat the body cannot produce. It is found primarily in vegetable oils, nuts, and seeds. It serves as a precursor to arachidonic acid and plays a role in skin health and cell membrane structure. Adequate levels are important, but very high intake relative to omega-3 may contribute to inflammatory imbalance.",
    aliases: ["LINOLEIC ACID", "LINOLEIC"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "aa-epa-ratio", displayName: "AA/EPA Ratio", fullName: "Arachidonic Acid/EPA Ratio",
    category: "Fatty Acids", defaultUnit: null,
    summary: "The AA/EPA ratio compares levels of arachidonic acid (an omega-6) to EPA (an omega-3), reflecting the balance between pro-inflammatory and anti-inflammatory fatty acids. A lower ratio suggests a more anti-inflammatory state and is associated with better cardiovascular health. High ratios are common in Western diets low in fish and high in vegetable oils. Reducing this ratio through increased omega-3 intake is a common health optimization target.",
    aliases: ["AA/EPA RATIO", "ARACHIDONIC/EPA RATIO", "ARACHIDONIC ACID/EPA RATIO", "AA / EPA RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["arachidonic-acid", "epa"],
      compute: ([aa, epa]) => aa / epa,
      formulaDisplay: "Arachidonic Acid ÷ EPA",
    },
  },
  {
    slug: "omega-6-omega-3-ratio", displayName: "Omega-6/Omega-3 Ratio", fullName: "Omega-6/Omega-3 Ratio",
    category: "Fatty Acids", defaultUnit: null,
    summary: "The Omega-6/Omega-3 ratio compares total omega-6 to total omega-3 fatty acids in your blood. A lower ratio is associated with reduced inflammation and lower risk of chronic diseases. Modern Western diets often have ratios of 15:1 or higher, while ancestral diets were closer to 1:1 to 4:1. Improving this ratio typically involves increasing omega-3 intake through fatty fish or supplements.",
    aliases: ["OMEGA-6/OMEGA-3 RATIO", "OMEGA 6/OMEGA 3 RATIO", "OMEGA6/OMEGA3 RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["omega-6-total", "omega-3-total"],
      compute: ([o6, o3]) => o6 / o3,
      formulaDisplay: "Omega-6 Total ÷ Omega-3 Total",
    },
  },

  // ─── Prostate (3) ───
  {
    slug: "psa-total", displayName: "PSA Total", fullName: "Prostate Specific Antigen Total",
    category: "Prostate", defaultUnit: "ng/mL",
    summary: "Prostate specific antigen (PSA) is a protein produced by both normal and cancerous prostate cells. It is the primary screening marker for prostate cancer in men. Elevated PSA levels may indicate prostate cancer, benign prostatic enlargement, or prostatitis. PSA screening is typically recommended for men starting around age 50, or earlier for those at higher risk.",
    aliases: ["PROSTATE-SPECIFIC AG", "PSA TOTAL", "PSA", "PROSTATE SPECIFIC ANTIGEN"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "psa-free", displayName: "PSA Free", fullName: "Prostate Specific Antigen Free",
    category: "Prostate", defaultUnit: "ng/mL",
    summary: "Free PSA measures the portion of prostate specific antigen that circulates unbound to proteins in the blood. It is used alongside total PSA to help distinguish between prostate cancer and benign conditions. A higher proportion of free PSA relative to total PSA is more suggestive of benign prostate conditions. It is typically ordered when total PSA is mildly elevated to help decide whether a biopsy is needed.",
    aliases: ["PSA FREE", "FREE PSA", "PROSTATE-SPECIFIC AG FREE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "psa-pct-free", displayName: "PSA % Free", fullName: "Prostate Specific Antigen % Free",
    category: "Prostate", defaultUnit: "%",
    summary: "PSA % Free represents the percentage of total PSA that is circulating in its free (unbound) form. A lower percentage of free PSA is more concerning for prostate cancer, while a higher percentage suggests benign prostate conditions. This ratio is most useful when total PSA falls in the borderline range. It helps clinicians decide whether to proceed with further testing such as a prostate biopsy.",
    aliases: ["PSA % FREE", "% FREE PSA"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["psa-free", "psa-total"],
      compute: ([free, total]) => (free / total) * 100,
      precision: 0,
      formulaDisplay: "(PSA Free ÷ PSA Total) × 100",
    },
  },

  // ─── Vitamins (3) ───
  {
    slug: "vitamin-d", displayName: "Vitamin D 25-Hydroxy", fullName: "Vitamin D 25-Hydroxy",
    category: "Vitamins", defaultUnit: "ng/mL",
    summary: "Vitamin D 25-Hydroxy is the primary circulating form of vitamin D and the best indicator of overall vitamin D status. Vitamin D is produced in the skin through sun exposure and obtained from dietary sources, then converted to its 25-hydroxy form in the liver. Low levels are associated with weakened bones, increased fracture risk, immune dysfunction, and fatigue. Deficiency is very common, especially in northern climates and in people with limited sun exposure.",
    aliases: ["VITAMIN D 25-HYDROXY TOTAL", "VITAMIN D 25-OH TOTAL", "25-HYDROXYVITAMIN D", "VITAMIN D TOTAL", "VIT D 25-OH TOTAL", "VITAMIN D 25-HYDROXY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "zinc", displayName: "Zinc", fullName: "Zinc",
    category: "Vitamins", defaultUnit: "\u00B5g/dL",
    summary: "Zinc is an essential trace mineral involved in over 300 enzymatic processes, including immune function, wound healing, DNA synthesis, and taste perception. It is obtained from dietary sources such as meat, shellfish, and legumes. Low zinc levels can impair immune function, slow wound healing, and cause taste and smell changes. It is often tested alongside other micronutrients when deficiency is suspected.",
    aliases: ["ZINC", "ZINC PLASMA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "methylmalonic-acid", displayName: "Methylmalonic Acid", fullName: "Methylmalonic Acid",
    category: "Vitamins", defaultUnit: "nmol/L",
    summary: "Methylmalonic acid (MMA) is a substance produced in small amounts during metabolism that increases when vitamin B12 is deficient. It is considered the most sensitive and specific marker for vitamin B12 deficiency, often rising before B12 blood levels drop. Elevated MMA confirms functional B12 deficiency at the tissue level, which can cause neurological damage and anemia. It is particularly useful when B12 levels are borderline.",
    aliases: ["METHYLMALONIC ACID", "MMA", "METHYLMALONIC ACID SERUM"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Toxins (2) ───
  {
    slug: "lead", displayName: "Lead", fullName: "Lead",
    category: "Toxins", defaultUnit: "\u00B5g/dL",
    summary: "Lead is a toxic heavy metal that can accumulate in the body through environmental exposure, including contaminated water, old paint, and occupational contact. It is measured in whole blood. Elevated lead levels can cause neurological damage, kidney injury, anemia, and developmental delays in children. There is no safe level of lead exposure, and even low levels are associated with adverse health effects.",
    aliases: ["LEAD", "LEAD BLOOD", "LEAD (BLOOD)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "mercury", displayName: "Mercury", fullName: "Mercury",
    category: "Toxins", defaultUnit: "\u00B5g/L",
    summary: "Mercury is a toxic heavy metal that enters the body primarily through seafood consumption, dental amalgams, and environmental exposure. It is measured in whole blood. Elevated mercury levels can cause neurological symptoms including tremors, memory problems, and numbness, as well as kidney damage. Regular monitoring is recommended for individuals with high fish consumption or occupational exposure.",
    aliases: ["MERCURY", "MERCURY BLOOD", "MERCURY (BLOOD)"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Autoimmune (2) ───
  {
    slug: "ana-screen", displayName: "ANA Screen", fullName: "Antinuclear Antibody Screen",
    category: "Autoimmune", defaultUnit: null,
    summary: "The antinuclear antibody (ANA) screen detects antibodies that target the nucleus of your own cells, a hallmark of autoimmune disease. A positive result suggests the immune system may be attacking the body\u2019s own tissues. ANA is commonly elevated in systemic lupus erythematosus but can also be positive in other autoimmune conditions and occasionally in healthy individuals. It is a screening test that typically requires follow-up testing for specific antibody patterns.",
    aliases: ["ANA SCREEN IFA", "ANA SCREEN", "ANA", "ANTINUCLEAR ANTIBODY"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rheumatoid-factor", displayName: "Rheumatoid Factor", fullName: "Rheumatoid Factor",
    category: "Autoimmune", defaultUnit: "IU/mL",
    summary: "Rheumatoid factor (RF) is an autoantibody found in the blood of many people with rheumatoid arthritis. It targets the body\u2019s own immunoglobulin G antibodies, contributing to joint inflammation and damage. Elevated RF supports a diagnosis of rheumatoid arthritis, though it can also be present in other autoimmune conditions and chronic infections. It is typically tested alongside anti-CCP antibodies for a more specific diagnosis.",
    aliases: ["RHEUMATOID FACTOR", "RF QUANT", "RHEUMATOID FACTOR QUANT"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Celiac (6) ───
  {
    slug: "ttg-igg", displayName: "tTG IgG", fullName: "Tissue Transglutaminase IgG",
    category: "Celiac", defaultUnit: "U/mL",
    summary: "Tissue transglutaminase IgG (tTG IgG) is an antibody measured to screen for celiac disease, particularly in individuals who are IgA-deficient. It targets tissue transglutaminase, a ubiquitous enzyme that deamidates gluten-derived gliadin peptides, triggering an immune response. Elevated levels suggest an immune reaction to gluten and possible celiac disease. It serves as an alternative to tTG IgA when IgA deficiency is present.",
    aliases: ["TTG IGG", "T-TRANSGLUTAMINASE (TTG) IGG", "TISSUE TRANSGLUTAMINASE IGG", "TISSUE TRANSGLUTAMINASE ANTIBODY IGG"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "ttg-iga", displayName: "tTG IgA", fullName: "Tissue Transglutaminase IgA",
    category: "Celiac", defaultUnit: "U/mL",
    summary: "Tissue transglutaminase IgA (tTG IgA) is the primary screening test for celiac disease. It detects IgA antibodies against tissue transglutaminase, a ubiquitous enzyme that deamidates gluten-derived gliadin peptides, amplifying the immune response. Elevated levels strongly suggest celiac disease and typically warrant confirmation with an intestinal biopsy. It is highly sensitive and specific, making it the first-line test for celiac screening.",
    aliases: ["TTG IGA", "T-TRANSGLUTAMINASE (TTG) IGA", "TISSUE TRANSGLUTAMINASE IGA", "TISSUE TRANSGLUTAMINASE ANTIBODY IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "gliadin-iga", displayName: "Gliadin IgA", fullName: "Gliadin IgA",
    category: "Celiac", defaultUnit: "U/mL",
    summary: "Gliadin IgA measures antibodies against gliadin, a component of gluten found in wheat, barley, and rye. It is used in the evaluation of celiac disease and gluten sensitivity. Elevated levels suggest an immune response to gluten, though this test is less specific for celiac disease than tTG antibodies. It may be used in combination with other celiac markers or for monitoring dietary compliance.",
    aliases: ["GLIADIN IGA", "GLIADIN ANTIBODY IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "deamidated-gliadin-iga", displayName: "Deamidated Gliadin IgA", fullName: "Deamidated Gliadin IgA",
    category: "Celiac", defaultUnit: "U/mL",
    summary: "Deamidated gliadin IgA measures antibodies against deamidated gliadin peptides, a modified form of gluten protein. It is a newer and more specific test for celiac disease compared to traditional gliadin antibodies. Elevated levels indicate an immune reaction to gluten and support a diagnosis of celiac disease. It is particularly useful in children under age 2, in whom tTG may be less reliable.",
    aliases: ["DEAMIDATED GLIADIN ABS IGA", "DEAMIDATED GLIADIN IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "deamidated-gliadin-igg", displayName: "Deamidated Gliadin IgG", fullName: "Deamidated Gliadin IgG",
    category: "Celiac", defaultUnit: "U/mL",
    summary: "Deamidated gliadin IgG measures IgG antibodies against deamidated gliadin peptides. It is especially useful for screening celiac disease in individuals with IgA deficiency, who may have falsely negative IgA-based tests. Elevated levels suggest an immune response to gluten. It is often ordered alongside tTG IgG as part of IgA-independent celiac screening.",
    aliases: ["DEAMIDATED GLIADIN ABS IGG", "DEAMIDATED GLIADIN IGG"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "iga-total", displayName: "Immunoglobulin A", fullName: "Immunoglobulin A",
    category: "Celiac", defaultUnit: "mg/dL",
    summary: "Immunoglobulin A (IgA) is an antibody that plays a critical role in mucosal immunity, protecting the lining of the respiratory and digestive tracts. It is the most abundant antibody in mucosal secretions. Total IgA is measured alongside celiac disease tests because IgA deficiency can cause false-negative results on IgA-based celiac antibody tests. Low levels indicate IgA deficiency and signal the need for IgG-based celiac testing.",
    aliases: ["IGA", "IMMUNOGLOBULIN A", "IGA TOTAL", "IGG/IGA"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Blood Type (2) ───
  {
    slug: "abo-group", displayName: "ABO Group", fullName: "ABO Blood Group",
    category: "Blood Type", defaultUnit: null,
    summary: "ABO blood group identifies your blood type as A, B, AB, or O based on the presence or absence of specific antigens on red blood cells. It is determined by inherited genes and remains constant throughout life. Blood type is essential for safe blood transfusions and organ transplants, as mismatched transfusions can cause life-threatening reactions. It may also have minor associations with disease risk.",
    aliases: ["ABO GROUP", "ABO TYPE", "ABO BLOOD TYPE", "BLOOD TYPE ABO"],
    region: null, regionGroupSlug: null, specimenType: null,
  },
  {
    slug: "rh-type", displayName: "Rh Type", fullName: "Rh Type",
    category: "Blood Type", defaultUnit: null,
    summary: "Rh type identifies whether you carry the Rh(D) antigen on your red blood cells, classifying you as Rh-positive or Rh-negative. About 85% of people are Rh-positive. Rh type is critical for blood transfusion safety and pregnancy management, as Rh-negative mothers carrying Rh-positive babies can develop antibodies that affect future pregnancies. It is always tested alongside ABO blood group.",
    aliases: ["RH TYPE", "RH(D) TYPE", "RH FACTOR", "RH(D) TYPING"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Genetic (1) ───
  {
    slug: "apoe-genotype", displayName: "APOE Genotype", fullName: "Apolipoprotein E Genotype",
    category: "Genetic", defaultUnit: null,
    summary: "APOE genotype identifies which variants of the apolipoprotein E gene you carry, with the three main alleles being e2, e3, and e4. Apolipoprotein E plays a key role in cholesterol metabolism and lipid transport in the brain. The e4 allele is the strongest known genetic risk factor for late-onset Alzheimer\u2019s disease, while e2 may be protective. APOE genotype also influences cholesterol levels and response to dietary fat.",
    aliases: ["APOE GENOTYPE", "APO E GENOTYPE", "APOLIPOPROTEIN E GENOTYPE"],
    region: null, regionGroupSlug: null, specimenType: null,
  },

  // ─── Urinalysis (17) ───
  {
    slug: "urine-color", displayName: "Color (Urine)", fullName: "Color (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Urine color provides a quick visual assessment of hydration status and potential urinary tract issues. Normal urine ranges from pale yellow to amber, with color intensity depending on concentration. Dark urine may indicate dehydration, while unusual colors like red or brown can suggest blood, liver problems, or dietary effects. It is part of a standard urinalysis.",
    aliases: ["COLOR", "URINE COLOR"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-appearance", displayName: "Appearance (Urine)", fullName: "Appearance (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Urine appearance describes whether the sample is clear or cloudy. Normal urine is typically clear to slightly hazy. Cloudy or turbid urine may indicate the presence of bacteria, white blood cells, crystals, or protein, potentially suggesting infection or kidney issues. It is one of the first observations made during a standard urinalysis.",
    aliases: ["APPEARANCE", "URINE APPEARANCE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-specific-gravity", displayName: "Specific Gravity", fullName: "Specific Gravity",
    category: "Urinalysis", defaultUnit: null,
    summary: "Specific gravity measures the concentration of dissolved substances in urine relative to pure water. It reflects the kidney\u2019s ability to concentrate or dilute urine. High specific gravity indicates concentrated urine from dehydration, while low values suggest dilute urine or impaired kidney concentrating ability. It is measured as part of a standard urinalysis.",
    aliases: ["SPECIFIC GRAVITY", "SP GRAVITY"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-ph", displayName: "pH (Urine)", fullName: "pH (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Urine pH measures the acidity or alkalinity of urine on a scale from 0 to 14. Normal urine pH typically ranges from 4.5 to 8.0, depending on diet and metabolic state. Abnormal pH can contribute to kidney stone formation and may indicate metabolic or respiratory acid-base disorders. It is measured as part of a routine urinalysis.",
    aliases: ["PH", "URINE PH"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-glucose", displayName: "Glucose (Urine)", fullName: "Glucose (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Glucose in urine is not normally present in significant amounts because the kidneys reabsorb glucose from the filtrate. Its presence indicates that blood glucose levels have exceeded the kidneys\u2019 reabsorption capacity. Urine glucose is most commonly associated with uncontrolled diabetes mellitus. It is detected as part of a standard urinalysis dipstick test.",
    aliases: ["GLUCOSE", "GLUCOSE URINE", "URINE GLUCOSE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-bilirubin", displayName: "Bilirubin (Urine)", fullName: "Bilirubin (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Bilirubin in urine is not normally present and its detection suggests liver or bile duct disease. Bilirubin appears in urine when conjugated bilirubin levels in the blood are elevated, as occurs with liver damage or bile duct obstruction. Its presence can indicate hepatitis, cirrhosis, or gallstones. It is detected as part of a standard urinalysis dipstick test.",
    aliases: ["BILIRUBIN", "BILIRUBIN URINE", "URINE BILIRUBIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-ketones", displayName: "Ketones", fullName: "Ketones",
    category: "Urinalysis", defaultUnit: null,
    summary: "Ketones in urine indicate that the body is breaking down fat for energy instead of glucose. This occurs during fasting, very low-carbohydrate diets, uncontrolled diabetes, or prolonged exercise. High levels in diabetics may indicate diabetic ketoacidosis, a serious medical emergency. Ketones are detected as part of a standard urinalysis dipstick test.",
    aliases: ["KETONES", "URINE KETONES", "KETONE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-occult-blood", displayName: "Occult Blood", fullName: "Occult Blood",
    category: "Urinalysis", defaultUnit: null,
    summary: "Occult blood in urine detects the presence of hemoglobin, red blood cells, or myoglobin that may not be visible to the naked eye. Its presence can indicate urinary tract infections, kidney stones, kidney disease, or bladder cancer, while myoglobin may indicate muscle breakdown. Even trace amounts warrant further investigation to determine the source. It is detected as part of a standard urinalysis dipstick test.",
    aliases: ["OCCULT BLOOD", "BLOOD URINE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-protein", displayName: "Protein (Urine)", fullName: "Protein (Urine)",
    category: "Urinalysis", defaultUnit: null,
    summary: "Protein in urine is not normally present in significant amounts, as healthy kidneys retain protein in the blood. Its presence may indicate kidney damage, particularly to the glomeruli. Persistent proteinuria is an important marker of chronic kidney disease and diabetic nephropathy. Small amounts can also occur temporarily with exercise, fever, or stress.",
    aliases: ["PROTEIN", "PROTEIN URINE", "URINE PROTEIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-nitrite", displayName: "Nitrite", fullName: "Nitrite",
    category: "Urinalysis", defaultUnit: null,
    summary: "Nitrite in urine is produced when certain bacteria convert dietary nitrates to nitrites. Its presence strongly suggests a urinary tract infection caused by gram-negative bacteria such as E. coli. A positive nitrite test is highly specific for UTI but not very sensitive, meaning a negative result does not rule out infection. It is detected as part of a standard urinalysis dipstick test.",
    aliases: ["NITRITE", "NITRITE URINE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-leukocyte-esterase", displayName: "Leukocyte Esterase", fullName: "Leukocyte Esterase",
    category: "Urinalysis", defaultUnit: null,
    summary: "Leukocyte esterase is an enzyme released by white blood cells in the urine. Its presence suggests inflammation or infection in the urinary tract. A positive result is commonly associated with urinary tract infections and may also be seen with kidney stones or other inflammatory conditions. It is detected as part of a standard urinalysis dipstick test and is often interpreted alongside nitrite results.",
    aliases: ["LEUKOCYTE ESTERASE", "LE"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-wbc", displayName: "WBC (Urine)", fullName: "WBC (Urine)",
    category: "Urinalysis", defaultUnit: "/HPF",
    summary: "White blood cells in urine indicate inflammation or infection in the urinary tract. They are identified by microscopic examination of a urine sample. Elevated WBCs commonly indicate urinary tract infections, kidney infections, or kidney stones. The presence of WBCs alongside bacteria strongly supports a diagnosis of UTI.",
    aliases: ["WBC", "WBC URINE", "URINE WBC"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-rbc", displayName: "RBC (Urine)", fullName: "RBC (Urine)",
    category: "Urinalysis", defaultUnit: "/HPF",
    summary: "Red blood cells in urine are identified through microscopic examination. Their presence may indicate urinary tract infections, kidney stones, kidney disease, or bladder cancer. Even small numbers of RBCs in urine can be clinically significant and may require further investigation. It is part of the microscopic analysis of a standard urinalysis.",
    aliases: ["RBC", "RBC URINE", "URINE RBC"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-epithelial-cells", displayName: "Epithelial Cells", fullName: "Epithelial Cells",
    category: "Urinalysis", defaultUnit: "/HPF",
    summary: "Epithelial cells in urine come from the lining of the urinary tract. A small number is normal, as cells naturally shed from the urinary tract lining. Large numbers of squamous epithelial cells often indicate sample contamination, while renal epithelial cells may suggest kidney tubular damage. The type and quantity of epithelial cells help assess sample quality and kidney health.",
    aliases: ["EPITHELIAL CELLS", "SQUAMOUS EPITHELIAL CELLS", "SQ. EPITHELIAL CELLS"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-bacteria", displayName: "Bacteria", fullName: "Bacteria",
    category: "Urinalysis", defaultUnit: null,
    summary: "Bacteria in urine are identified through microscopic examination. While small numbers may represent contamination, significant bacteria along with white blood cells strongly suggests a urinary tract infection. The presence of bacteria typically prompts a urine culture to identify the specific organism and determine antibiotic sensitivity. It is assessed as part of the microscopic analysis of a urinalysis.",
    aliases: ["BACTERIA"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-hyaline-cast", displayName: "Hyaline Cast", fullName: "Hyaline Cast",
    category: "Urinalysis", defaultUnit: "/LPF",
    summary: "Hyaline casts are transparent, cylindrical structures formed in the kidney\u2019s tubules from Tamm-Horsfall protein. A small number is normal and can increase with dehydration, exercise, or diuretic use. They are the most common type of urinary cast and are generally not clinically significant on their own. Their presence is noted during the microscopic analysis of a urinalysis.",
    aliases: ["HYALINE CAST", "HYALINE CASTS"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },
  {
    slug: "urine-albumin", displayName: "Albumin (Urine)", fullName: "Albumin (Urine)",
    category: "Urinalysis", defaultUnit: "mg/dL",
    summary: "Urine albumin detects small amounts of the protein albumin leaking into the urine. Healthy kidneys normally prevent albumin from passing into the urine. Elevated urine albumin is an early marker of kidney damage, particularly from diabetes and hypertension. Regular screening is recommended for diabetics, as early detection allows intervention to slow kidney disease progression.",
    aliases: ["ALBUMIN", "ALBUMIN URINE", "URINE ALBUMIN", "MICROALBUMIN"],
    region: null, regionGroupSlug: null, specimenType: "urine",
  },

  // ─── Body Composition — special metrics (4) ───
  {
    slug: "resting-metabolic-rate", displayName: "Resting Metabolic Rate", fullName: "Resting Metabolic Rate",
    category: "Body Composition", defaultUnit: "kcal/day",
    summary: "Resting metabolic rate (RMR) is the number of calories your body burns at rest to maintain basic life functions like breathing, circulation, and cell repair. It is estimated from a DEXA scan based on lean tissue mass and other body composition data. A higher RMR typically correlates with greater lean body mass. Understanding your RMR can help guide nutrition and weight management strategies.",
    aliases: ["RMR", "RESTING METABOLIC RATE", "ESTIMATED RESTING METABOLIC RATE"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "android-gynoid-ratio", displayName: "Android/Gynoid Ratio", fullName: "Android/Gynoid Ratio",
    category: "Body Composition", defaultUnit: null,
    summary: "The Android/Gynoid ratio compares fat distribution in the abdominal (android) region to the hip and thigh (gynoid) region. It is measured by DEXA scan and reflects body fat distribution patterns. A higher ratio indicates more central or abdominal fat, which is associated with greater cardiovascular and metabolic risk. Lower ratios suggest a more peripheral fat distribution, which is generally considered healthier.",
    aliases: ["A/G RATIO", "ANDROID/GYNOID RATIO"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
    derivative: {
      components: ["fat-pct-android", "fat-pct-gynoid"],
      compute: ([android, gynoid]) => android / gynoid,
      formulaDisplay: "Android Fat % ÷ Gynoid Fat %",
    },
  },
  {
    slug: "vat-mass", displayName: "VAT Mass", fullName: "Visceral Adipose Tissue Mass",
    category: "Body Composition", defaultUnit: "lbs",
    summary: "Visceral adipose tissue (VAT) mass measures the weight of fat stored around your internal organs in the abdominal cavity. It is measured by DEXA scan and is distinct from subcutaneous fat under the skin. Excess visceral fat is strongly associated with insulin resistance, type 2 diabetes, cardiovascular disease, and metabolic syndrome. Reducing VAT is a key goal for improving metabolic health.",
    aliases: ["VAT MASS", "VISCERAL ADIPOSE TISSUE MASS"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  {
    slug: "vat-volume", displayName: "VAT Volume", fullName: "Visceral Adipose Tissue Volume",
    category: "Body Composition", defaultUnit: "in\u00B3",
    summary: "Visceral adipose tissue (VAT) volume measures the space occupied by fat around your internal organs in the abdominal cavity. It is measured by DEXA scan and provides a volumetric assessment of abdominal organ fat. Higher VAT volume is associated with increased risk of cardiovascular disease, type 2 diabetes, and metabolic syndrome. It complements VAT mass as a measure of metabolic risk.",
    aliases: ["VAT VOLUME", "VISCERAL ADIPOSE TISSUE VOLUME"],
    region: null, regionGroupSlug: null, specimenType: "body_composition",
  },
  // ─── Body Composition — regional (60 generated: 6 metrics × 10 regions) ───
  ...generateBodyCompEntries(),

  // ─── Bone (10 generated: 8 BMD + 1 T-Score + 1 Z-Score) ───
  ...generateBoneEntries(),

  // ─── Derivative-only entries (4) ───
  {
    slug: "homa-ir", displayName: "HOMA-IR", fullName: "Homeostatic Model Assessment for Insulin Resistance",
    category: "Metabolic", defaultUnit: null,
    summary: "HOMA-IR (Homeostatic Model Assessment for Insulin Resistance) estimates insulin resistance from fasting insulin and glucose levels. Higher values indicate greater insulin resistance, which is a precursor to type 2 diabetes and metabolic syndrome. Values below 1.0 suggest optimal insulin sensitivity, while values above 2.0 may indicate insulin resistance. It is widely used in clinical research and metabolic health assessment.",
    aliases: ["HOMA-IR", "HOMA IR"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["insulin", "glucose"],
      compute: ([ins, glu]) => (ins * glu) / 405,
      formulaDisplay: "(Insulin × Glucose) ÷ 405",
    },
  },
  {
    slug: "nlr", displayName: "NLR", fullName: "Neutrophil/Lymphocyte Ratio",
    category: "Inflammation", defaultUnit: null,
    summary: "The Neutrophil/Lymphocyte Ratio (NLR) is a simple marker of systemic inflammation calculated from routine blood counts. Higher NLR values indicate greater inflammatory burden and physiological stress. Elevated NLR is associated with cardiovascular disease, cancer prognosis, and infection severity. It is increasingly used as a low-cost inflammatory biomarker in clinical practice.",
    aliases: ["NLR", "NEUTROPHIL/LYMPHOCYTE RATIO", "NEUTROPHIL LYMPHOCYTE RATIO"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["neutrophils-absolute", "lymphocytes-absolute"],
      compute: ([neut, lymph]) => neut / lymph,
      formulaDisplay: "Neutrophils ÷ Lymphocytes",
    },
  },
  {
    slug: "vldl-cholesterol", displayName: "VLDL Cholesterol", fullName: "VLDL Cholesterol",
    category: "Heart", defaultUnit: "mg/dL",
    summary: "VLDL cholesterol (very-low-density lipoprotein) carries triglycerides from the liver to tissues throughout the body. It is typically estimated by dividing triglycerides by 5. Elevated VLDL contributes to plaque buildup in arteries and is associated with increased cardiovascular risk. It is considered an atherogenic lipoprotein alongside LDL.",
    aliases: ["VLDL CHOLESTEROL", "VLDL", "VLDL-C", "VLDL CHOLESTEROL CALC"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["triglycerides"],
      compute: ([tg]) => tg / 5,
      precision: 0,
      formulaDisplay: "Triglycerides ÷ 5",
    },
  },
  {
    slug: "anion-gap", displayName: "Anion Gap", fullName: "Anion Gap",
    category: "Electrolytes", defaultUnit: "mEq/L",
    summary: "The Anion Gap measures the difference between measured cations (sodium) and measured anions (chloride and bicarbonate) in the blood. It helps identify the cause of metabolic acidosis. An elevated anion gap suggests conditions like diabetic ketoacidosis, lactic acidosis, or toxic ingestions. A normal anion gap acidosis points to different causes such as diarrhea or renal tubular acidosis.",
    aliases: ["ANION GAP"],
    region: null, regionGroupSlug: null, specimenType: null,
    derivative: {
      components: ["sodium", "chloride", "carbon-dioxide"],
      compute: ([na, cl, co2]) => na - (cl + co2),
      precision: 0,
      formulaDisplay: "Sodium − (Chloride + CO₂)",
    },
  },
];

// ── Alias lookup map ────────────────────────────

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/,/g, "").replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
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

// ── Region prefix stripping (for DEXA matching) ─

const ALL_REGION_PREFIXES = [
  ...BODY_COMP_REGIONS.map((r) => r.name),
  ...BONE_REGIONS.map((r) => r.name),
]
  .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  .map((name) => normalize(name))
  .sort((a, b) => b.length - a.length); // longest first to avoid partial matches

function stripRegionPrefix(normalizedKey: string): string | null {
  for (const prefix of ALL_REGION_PREFIXES) {
    if (normalizedKey.startsWith(prefix + " ")) {
      return normalizedKey.slice(prefix.length + 1);
    }
  }
  return null;
}

// ── Match function ──────────────────────────────

function disambiguate(
  candidates: CanonicalBiomarker[],
  specimenType: "blood" | "urine" | "body_composition" | null,
  normalizedRegion: string | null
): CanonicalBiomarker | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (specimenType) {
    const bySpecimen = candidates.filter(
      (c) => c.specimenType === specimenType
    );
    if (bySpecimen.length === 1) return bySpecimen[0];

    if (bySpecimen.length > 1) {
      const byRegion = bySpecimen.filter(
        (c) => c.region === normalizedRegion
      );
      if (byRegion.length === 1) return byRegion[0];
    }

    if (bySpecimen.length > 0) return bySpecimen[0];
  }

  const byRegion = candidates.filter((c) => c.region === normalizedRegion);
  if (byRegion.length === 1) return byRegion[0];

  return candidates[0];
}

export function matchBiomarker(
  rawName: string,
  specimenType: "blood" | "urine" | "body_composition" | null,
  region: string | null,
  metricName?: string
): CanonicalBiomarker | null {
  const normalizedRegion =
    region && region.toUpperCase() === "TOTAL BODY" ? null : region;

  // Build ordered list of lookup keys to try
  const keysToTry: string[] = [normalize(rawName)];

  if (specimenType === "body_composition") {
    const stripped = stripRegionPrefix(normalize(rawName));
    if (stripped) keysToTry.push(stripped);
  }

  if (metricName) {
    keysToTry.push(normalize(metricName));
    if (specimenType === "body_composition") {
      const stripped = stripRegionPrefix(normalize(metricName));
      if (stripped) keysToTry.push(stripped);
    }
  }

  for (const key of keysToTry) {
    const candidates = aliasMap.get(key);
    if (!candidates || candidates.length === 0) continue;
    const result = disambiguate(candidates, specimenType, normalizedRegion);
    if (result) return result;
  }

  return null;
}

// ── Derivative info helper ──────────────────────

export function getDerivativeInfo(slug: string): { entry: CanonicalBiomarker; derivative: DerivativeDefinition } | null {
  const entry = REGISTRY.find((e) => e.slug === slug && e.derivative);
  if (!entry || !entry.derivative) return null;
  return { entry, derivative: entry.derivative };
}
