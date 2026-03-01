// Barrel re-export — all existing imports from "@/lib/biomarker-registry" keep working.
export type { BiomarkerCategory, DerivativeDefinition, CanonicalBiomarker } from "./types";
export { REGISTRY, BODY_COMP_REGIONS, BONE_REGIONS } from "./data";
export { matchBiomarker, getDerivativeInfo } from "./match";
