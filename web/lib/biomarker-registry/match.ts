// ────────────────────────────────────────────────
// Canonical Biomarker Registry — Matching Logic
// ────────────────────────────────────────────────

import type { CanonicalBiomarker, DerivativeDefinition } from "./types";
import { REGISTRY, BODY_COMP_REGIONS, BONE_REGIONS } from "./data";

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
