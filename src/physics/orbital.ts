/**
 * Orbital mechanics — Kepler solver and orbital-element -> 3D position.
 *
 * Pure functions. Lengths in meters, angles in radians. Reference frame is
 * heliocentric ecliptic (x toward the vernal equinox, z out of the ecliptic).
 *
 * For the *visual* orbit we don't need time-accurate propagation: we sweep the
 * true anomaly 0->2π to draw the ellipse, and advance the mean anomaly to move
 * a marker along it (see scene/AsteroidOrbit.tsx).
 */
import { AU_M } from "./constants";

export type Vec3 = [number, number, number];

export interface OrbitalElements {
  /** Semi-major axis a (m). */
  semiMajorAxisM: number;
  /** Eccentricity e (unitless). */
  eccentricity: number;
  /** Inclination i (radians). */
  inclinationRad: number;
  /** Longitude of ascending node Ω (radians). */
  ascendingNodeRad: number;
  /** Argument of periapsis ω (radians). */
  argPeriapsisRad: number;
  /** Mean anomaly M (radians). */
  meanAnomalyRad: number;
}

/**
 * Solve Kepler's equation  M = E − e·sin(E)  for the eccentric anomaly E,
 * by Newton–Raphson. Converges to |ΔE| < 1e-8.
 */
export function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  const M = meanAnomalyRad;
  // Better starting guess for high eccentricity.
  let E = eccentricity < 0.8 ? M : Math.PI;
  for (let iter = 0; iter < 100; iter++) {
    const dE =
      (E - eccentricity * Math.sin(E) - M) /
      (1 - eccentricity * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/** True anomaly ν from eccentric anomaly E. */
export function trueAnomalyFromEccentric(E: number, eccentricity: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(E / 2),
    )
  );
}

/** Orbital radius r = a·(1 − e·cos E). */
export function orbitalRadius(a: number, e: number, E: number): number {
  return a * (1 - e * Math.cos(E));
}

/**
 * Heliocentric position (m) at a given true anomaly ν, rotating the
 * perifocal (x',y') point by ω, i, Ω into the ecliptic frame.
 */
export function heliocentricPosition(
  el: OrbitalElements,
  trueAnomalyRad: number,
): Vec3 {
  const { semiMajorAxisM: a, eccentricity: e } = el;
  const i = el.inclinationRad;
  const Om = el.ascendingNodeRad;
  const w = el.argPeriapsisRad;
  const nu = trueAnomalyRad;

  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  const xp = r * Math.cos(nu);
  const yp = r * Math.sin(nu);

  const cosO = Math.cos(Om);
  const sinO = Math.sin(Om);
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const x =
    (cosO * cosw - sinO * sinw * cosi) * xp +
    (-cosO * sinw - sinO * cosw * cosi) * yp;
  const y =
    (sinO * cosw + cosO * sinw * cosi) * xp +
    (-sinO * sinw + cosO * cosw * cosi) * yp;
  const z = sinw * sini * xp + cosw * sini * yp;

  return [x, y, z];
}

/** Heliocentric position (m) for the body's current mean anomaly. */
export function positionFromMeanAnomaly(el: OrbitalElements): Vec3 {
  const E = solveKepler(el.meanAnomalyRad, el.eccentricity);
  const nu = trueAnomalyFromEccentric(E, el.eccentricity);
  return heliocentricPosition(el, nu);
}

/** Sample the full ellipse (m) for drawing — sweeps ν from 0→2π. */
export function sampleOrbitPath(el: OrbitalElements, steps = 180): Vec3[] {
  const pts: Vec3[] = [];
  for (let k = 0; k <= steps; k++) {
    const nu = (k / steps) * 2 * Math.PI;
    pts.push(heliocentricPosition(el, nu));
  }
  return pts;
}

/** Convert a position in meters to astronomical units. */
export function toAU(p: Vec3): Vec3 {
  return [p[0] / AU_M, p[1] / AU_M, p[2] / AU_M];
}
