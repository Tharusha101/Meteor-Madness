/**
 * Physics barrel + the top-level impact orchestrator.
 *
 * `computeImpact` is the single pure function the UI/store calls to turn raw
 * slider params into a full results object. Keeping it here (not in the store)
 * means the whole params -> results pipeline stays unit-testable.
 */
import {
  asteroidMass,
  impactVelocity,
  joulesToMegatons,
  kineticEnergy,
} from "./energy";
import { craterDimensions, type CraterResult } from "./crater";
import { richterMagnitude } from "./seismic";

export * from "./constants";
export * from "./energy";
export * from "./crater";
export * from "./seismic";
export * from "./deflection";
export * from "./orbital";
export * from "./blast";

/** Raw user/sim inputs (UI-friendly units). */
export interface ImpactParams {
  /** Impactor diameter (m). */
  diameterM: number;
  /** Impactor density (kg/m^3). */
  densityKgM3: number;
  /** Close-approach relative velocity v_inf (km/s). */
  velocityKmS: number;
  /** Impact angle from horizontal (degrees). */
  impactAngleDeg: number;
}

/** Fully-derived impact results (SI unless noted). */
export interface ImpactResults {
  /** Relative velocity far from Earth (m/s). */
  vInfMs: number;
  /** Surface impact velocity, escape-boosted (m/s). */
  vImpactMs: number;
  /** Impactor mass (kg). */
  massKg: number;
  /** Kinetic energy at impact (joules). */
  energyJ: number;
  /** Kinetic energy (megatons TNT). */
  energyMegatons: number;
  /** Crater dimensions. */
  crater: CraterResult;
  /** Equivalent seismic magnitude (Richter). */
  richter: number;
}

/**
 * Turn raw params into a complete results object.
 *
 * This is where unit conversion happens (km/s -> m/s) and the escape-velocity
 * boost is applied — the one place the pipeline is wired together.
 */
export function computeImpact(params: ImpactParams): ImpactResults {
  const vInfMs = params.velocityKmS * 1000;
  const vImpactMs = impactVelocity(vInfMs);
  const massKg = asteroidMass(params.diameterM, params.densityKgM3);
  const energyJ = kineticEnergy(massKg, vImpactMs);
  const energyMegatons = joulesToMegatons(energyJ);
  const crater = craterDimensions(
    params.diameterM,
    params.densityKgM3,
    vImpactMs,
    params.impactAngleDeg,
  );
  const richter = richterMagnitude(energyJ);

  return {
    vInfMs,
    vImpactMs,
    massKg,
    energyJ,
    energyMegatons,
    crater,
    richter,
  };
}
