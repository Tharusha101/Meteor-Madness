/**
 * Crater scaling (π-group scaling laws, EIEP / Collins et al. 2005).
 *
 * θ is the impact angle measured from the horizontal (45° is the most likely
 * impact angle). All lengths in meters, velocity in m/s.
 */
import {
  COMPLEX_CRATER_DC_M,
  COMPLEX_TRANSITION_DTC_M,
  DENSITY_TARGET,
  G,
} from "./constants";

export interface CraterResult {
  /** Transient crater diameter (m). */
  transientDiameterM: number;
  /** Final crater diameter (m), after collapse for complex craters. */
  finalDiameterM: number;
  /** Approximate transient crater depth (m). */
  depthM: number;
  /** True if the final crater is "complex" (large), false if "simple". */
  isComplex: boolean;
}

/**
 * Compute transient + final crater dimensions.
 *
 * @param diameterM         impactor diameter (m)
 * @param densityImpactor   impactor density (kg/m^3)
 * @param vImpactMs         surface impact velocity (m/s)
 * @param impactAngleDeg    impact angle from horizontal (degrees)
 * @param densityTarget     target/ground density (kg/m^3), default sedimentary crust
 */
export function craterDimensions(
  diameterM: number,
  densityImpactor: number,
  vImpactMs: number,
  impactAngleDeg: number,
  densityTarget: number = DENSITY_TARGET,
): CraterResult {
  const thetaRad = (impactAngleDeg * Math.PI) / 180;

  // Transient crater diameter (m).
  const transientDiameterM =
    1.161 *
    (densityImpactor / densityTarget) ** (1 / 3) *
    diameterM ** 0.78 *
    vImpactMs ** 0.44 *
    G ** -0.22 *
    Math.sin(thetaRad) ** (1 / 3);

  // Simple if the transient crater is below the transition size, else complex.
  const isComplex = transientDiameterM >= COMPLEX_TRANSITION_DTC_M;

  const finalDiameterM = isComplex
    ? (1.17 * transientDiameterM ** 1.13) / COMPLEX_CRATER_DC_M ** 0.13
    : 1.25 * transientDiameterM;

  // Transient depth ≈ Dtc / (2√2).
  const depthM = transientDiameterM / 2.828;

  return { transientDiameterM, finalDiameterM, depthM, isComplex };
}
