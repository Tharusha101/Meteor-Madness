/**
 * Air-blast / thermal damage rings for the impact map.
 *
 * APPROXIMATE, clearly-labeled estimate. Blast effects scale roughly with the
 * cube root of yield (Hopkinson–Cranz scaling): R ∝ E^(1/3). We anchor each
 * damage threshold to a reference radius at 1 megaton (order-of-magnitude
 * figures from nuclear-effects literature) and scale by the cube root of the
 * impact energy in megatons. This is a teaching visualization, not a precise
 * blast model — do not over-claim accuracy.
 */

export interface BlastRing {
  key: string;
  label: string;
  /** Ring radius from ground zero (m). */
  radiusM: number;
  description: string;
  /** Suggested map color (hex). */
  color: string;
}

interface BlastRef {
  key: string;
  label: string;
  /** Reference radius at 1 megaton (km). */
  refRadiusKm: number;
  description: string;
  color: string;
}

const BLAST_REFS: BlastRef[] = [
  {
    key: "fireball",
    label: "Fireball",
    refRadiusKm: 1.0,
    description: "Vaporized — everything inside is incinerated.",
    color: "#fef08a",
  },
  {
    key: "severe",
    label: "Severe blast (~20 psi)",
    refRadiusKm: 3.2,
    description: "Reinforced concrete buildings collapse; near-total fatalities.",
    color: "#f87171",
  },
  {
    key: "moderate",
    label: "Moderate blast (~5 psi)",
    refRadiusKm: 6.2,
    description: "Most residential buildings collapse; widespread fatalities.",
    color: "#fb923c",
  },
  {
    key: "thermal",
    label: "Thermal burns",
    refRadiusKm: 11,
    description: "Third-degree burns; fires ignite across the area.",
    color: "#fbbf24",
  },
  {
    key: "light",
    label: "Light blast (~1 psi)",
    refRadiusKm: 16,
    description: "Windows shatter; flying glass causes injuries.",
    color: "#38bdf8",
  },
];

/**
 * Damage rings for an impact of the given energy (megatons TNT), sorted
 * largest-radius first so a map can paint them back-to-front.
 */
export function blastRings(energyMegatons: number): BlastRing[] {
  const scale = Math.cbrt(Math.max(energyMegatons, 0));
  return BLAST_REFS.map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description,
    color: r.color,
    radiusM: r.refRadiusKm * 1000 * scale,
  })).sort((a, b) => b.radiusM - a.radiusM);
}
