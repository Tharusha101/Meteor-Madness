/**
 * Impact velocity, mass and kinetic energy.
 *
 * Pure functions only. All inputs/outputs are SI (meters, kg, m/s, joules)
 * unless the name says otherwise.
 */
import { J_PER_MEGATON, V_ESCAPE_EARTH } from "./constants";

/**
 * Surface impact velocity (m/s).
 *
 * The NEO close-approach ("relative") velocity `vInf` is measured far from
 * Earth. Earth's gravity accelerates the body as it falls in, so the velocity
 * at the surface is boosted by the escape velocity:
 *
 *   v_impact = sqrt(v_inf^2 + v_escape^2)
 *
 * Atmospheric deceleration is ignored (small stony bodies < ~50-100 m may
 * airburst instead of reaching the ground — flagged in the UI, not modeled).
 */
export function impactVelocity(vInfMs: number): number {
  return Math.sqrt(vInfMs * vInfMs + V_ESCAPE_EARTH * V_ESCAPE_EARTH);
}

/** Mass of a spherical impactor (kg): (π/6)·ρ·D³ = (4/3)·π·r³·ρ. */
export function asteroidMass(diameterM: number, densityKgM3: number): number {
  return (Math.PI / 6) * densityKgM3 * diameterM ** 3;
}

/** Kinetic energy (joules): ½·m·v². */
export function kineticEnergy(massKg: number, vImpactMs: number): number {
  return 0.5 * massKg * vImpactMs * vImpactMs;
}

/** Convert joules to megatons of TNT. */
export function joulesToMegatons(energyJ: number): number {
  return energyJ / J_PER_MEGATON;
}
