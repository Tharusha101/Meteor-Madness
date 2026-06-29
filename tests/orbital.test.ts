import { describe, it, expect } from "vitest";
import {
  AU_M,
  heliocentricPosition,
  orbitalRadius,
  positionFromMeanAnomaly,
  sampleOrbitPath,
  solveKepler,
  trueAnomalyFromEccentric,
  type OrbitalElements,
} from "../src/physics";

const circular: OrbitalElements = {
  semiMajorAxisM: AU_M,
  eccentricity: 0,
  inclinationRad: 0,
  ascendingNodeRad: 0,
  argPeriapsisRad: 0,
  meanAnomalyRad: 0,
};

describe("solveKepler", () => {
  it("returns 0 when the mean anomaly is 0", () => {
    expect(solveKepler(0, 0.3)).toBeCloseTo(0, 8);
  });

  it("equals the mean anomaly for a circular orbit (e=0)", () => {
    expect(solveKepler(1.23, 0)).toBeCloseTo(1.23, 8);
  });

  it("satisfies Kepler's equation M = E − e·sin(E)", () => {
    const e = 0.6;
    const M = 1.0;
    const E = solveKepler(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });

  it("converges for high eccentricity", () => {
    const e = 0.95;
    const M = 0.4;
    const E = solveKepler(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });
});

describe("trueAnomaly / radius", () => {
  it("true anomaly is 0 at periapsis (E=0)", () => {
    expect(trueAnomalyFromEccentric(0, 0.3)).toBeCloseTo(0, 8);
  });

  it("radius equals a for a circular orbit", () => {
    expect(orbitalRadius(AU_M, 0, 1.0)).toBeCloseTo(AU_M, 3);
  });

  it("radius is a(1-e) at periapsis and a(1+e) at apoapsis", () => {
    const a = AU_M;
    const e = 0.2;
    expect(orbitalRadius(a, e, 0)).toBeCloseTo(a * (1 - e), 3);
    expect(orbitalRadius(a, e, Math.PI)).toBeCloseTo(a * (1 + e), 3);
  });
});

describe("heliocentricPosition", () => {
  it("places a simple orbit at [a,0,0] at true anomaly 0", () => {
    const [x, y, z] = heliocentricPosition(circular, 0);
    expect(x).toBeCloseTo(AU_M, 3);
    expect(y).toBeCloseTo(0, 3);
    expect(z).toBeCloseTo(0, 3);
  });

  it("keeps a zero-inclination orbit in the z=0 plane", () => {
    for (const nu of [0, 1, 2, 3, 5]) {
      const [, , z] = heliocentricPosition(circular, nu);
      expect(z).toBeCloseTo(0, 3);
    }
  });

  it("puts perihelion at distance a(1-e) via the mean anomaly", () => {
    const el: OrbitalElements = { ...circular, eccentricity: 0.3 };
    const [x, y, z] = positionFromMeanAnomaly(el);
    const r = Math.hypot(x, y, z);
    expect(r).toBeCloseTo(AU_M * (1 - 0.3), 2);
  });
});

describe("sampleOrbitPath", () => {
  it("returns steps+1 points and is closed", () => {
    const pts = sampleOrbitPath(circular, 64);
    expect(pts).toHaveLength(65);
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(last[0]).toBeCloseTo(first[0], 3);
    expect(last[1]).toBeCloseTo(first[1], 3);
  });
});
