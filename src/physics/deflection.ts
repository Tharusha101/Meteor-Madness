/**
 * Asteroid deflection (kinetic impactor).
 *
 * Momentum transfer with enhancement factor β (ejecta recoil). NASA's DART
 * mission measured β ≈ 3.6; reasonable values are ~2–4.
 *
 *   Δv = β · (m_impactor · v_impactor) / m_asteroid
 *
 * Teaching point surfaced in the UI: a tiny Δv applied years early beats a huge
 * Δv applied days before impact — the downrange miss grows with lead time.
 */
import {
  DART_BETA,
  GRAVITATIONAL_CONSTANT,
  J_PER_MEGATON,
  LASER_EFFICIENCY,
  LASER_EXHAUST_VEL,
  NUCLEAR_COUPLING,
  NUCLEAR_EJECTA_VEL,
} from "./constants";

export interface KineticImpactorParams {
  /** Mass of the spacecraft impactor (kg). */
  impactorMassKg: number;
  /** Closing velocity of the impactor (m/s). */
  impactorVelocityMs: number;
  /** Mass of the target asteroid (kg). */
  asteroidMassKg: number;
  /** Lead time before impact that the deflection is applied (seconds). */
  leadTimeS: number;
  /** Momentum enhancement factor (default: DART's β ≈ 3.6). */
  beta?: number;
}

export interface DeflectionResult {
  /** Velocity change imparted to the asteroid (m/s). */
  deltaVMs: number;
  /** First-order downrange shift of the impact point after the lead time (m). */
  downrangeShiftM: number;
}

/**
 * Compute the Δv and resulting downrange miss distance from a kinetic impactor.
 *
 * The downrange shift is a deliberately simple first-order estimate
 * (shift = Δv · leadTime); real along-track orbital dynamics amplify this.
 */
export function kineticImpactorDeflection(
  params: KineticImpactorParams,
): DeflectionResult {
  const beta = params.beta ?? DART_BETA;
  const deltaVMs =
    (beta * params.impactorMassKg * params.impactorVelocityMs) /
    params.asteroidMassKg;
  const downrangeShiftM = deltaVMs * params.leadTimeS;
  return { deltaVMs, downrangeShiftM };
}

// ---------------------------------------------------------------------------
// Additional deflection methods for the "Defend Earth" game.
//
// All return the same shape. Impulsive methods (kinetic, nuclear) deliver their
// Δv at deployment, so the impact point drifts by Δv·T over the remaining lead
// time T. Continuous methods (gravity tractor, laser) ramp the Δv up over T, so
// the displacement is ½·a·T² = ½·Δv·T (half the impulse, since the push is
// spread out). Constants are illustrative — tuned for gameplay, see constants.ts.
// ---------------------------------------------------------------------------

/** The four real-world deflection strategies offered in the game. */
export type DeflectionMethod = "kinetic" | "nuclear" | "gravity" | "laser";

export interface MethodOutcome extends DeflectionResult {
  /** True for continuous-thrust methods (gravity tractor, laser ablation). */
  continuous: boolean;
}

/**
 * Nuclear standoff burst: X-rays vaporize a surface layer whose recoil pushes
 * the asteroid. Δv = coupling · yield / (ejectaSpeed · mass). Impulsive.
 */
export function nuclearDeflection(params: {
  yieldMegatons: number;
  asteroidMassKg: number;
  leadTimeS: number;
  coupling?: number;
  ejectaVelocityMs?: number;
}): MethodOutcome {
  const coupling = params.coupling ?? NUCLEAR_COUPLING;
  const ejecta = params.ejectaVelocityMs ?? NUCLEAR_EJECTA_VEL;
  const yieldJ = params.yieldMegatons * J_PER_MEGATON;
  const momentum = (coupling * yieldJ) / ejecta;
  const deltaVMs = momentum / params.asteroidMassKg;
  return {
    deltaVMs,
    downrangeShiftM: deltaVMs * params.leadTimeS,
    continuous: false,
  };
}

/**
 * Gravity tractor: a spacecraft hovers nearby and its gravity slowly tugs the
 * asteroid. Acceleration a = G·m_spacecraft / d² is INDEPENDENT of the
 * asteroid's mass — so it works on any size, but only over long times. Continuous.
 */
export function gravityTractorDeflection(params: {
  spacecraftMassKg: number;
  standoffDistanceM: number;
  leadTimeS: number;
}): MethodOutcome {
  const a =
    (GRAVITATIONAL_CONSTANT * params.spacecraftMassKg) /
    params.standoffDistanceM ** 2;
  const deltaVMs = a * params.leadTimeS;
  const downrangeShiftM = 0.5 * a * params.leadTimeS ** 2;
  return { deltaVMs, downrangeShiftM, continuous: true };
}

/**
 * Laser ablation: a focused beam vaporizes the surface; the plume acts as
 * thrust. F = efficiency · power / exhaustSpeed, a = F / mass. Continuous, and
 * (unlike the gravity tractor) weaker on more massive asteroids.
 */
export function laserAblationDeflection(params: {
  powerWatts: number;
  asteroidMassKg: number;
  leadTimeS: number;
  efficiency?: number;
  exhaustVelocityMs?: number;
}): MethodOutcome {
  const eta = params.efficiency ?? LASER_EFFICIENCY;
  const vex = params.exhaustVelocityMs ?? LASER_EXHAUST_VEL;
  const thrust = (eta * params.powerWatts) / vex;
  const a = thrust / params.asteroidMassKg;
  const deltaVMs = a * params.leadTimeS;
  const downrangeShiftM = 0.5 * a * params.leadTimeS ** 2;
  return { deltaVMs, downrangeShiftM, continuous: true };
}

/**
 * Whether a nuclear burst of the given yield would SHATTER (disrupt) an asteroid
 * of the given diameter rather than nudge it intact. Smaller bodies disrupt far
 * more easily (binding energy grows with volume ∝ diameter³). Disruption is only
 * "safe" if there's enough lead time for the fragments to spread clear of Earth.
 */
export function nuclearWillShatter(
  yieldMegatons: number,
  diameterM: number,
): boolean {
  // Yield needed to shatter scales with the cube of (diameter / 100 m).
  const shatterThresholdMt = 0.5 * (diameterM / 100) ** 3;
  return yieldMegatons > shatterThresholdMt;
}
