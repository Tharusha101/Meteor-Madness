import { describe, it, expect } from "vitest";
import {
  asteroidMass,
  computeImpact,
  craterDimensions,
  impactVelocity,
  joulesToMegatons,
  kineticEnergy,
  kineticImpactorDeflection,
  richterMagnitude,
  DENSITY_STONY,
  J_PER_MEGATON,
  V_ESCAPE_EARTH,
} from "../src/physics";

describe("impactVelocity (escape-velocity boost)", () => {
  it("adds the escape velocity in quadrature", () => {
    const vInf = 19_000; // m/s
    const expected = Math.sqrt(vInf ** 2 + V_ESCAPE_EARTH ** 2);
    expect(impactVelocity(vInf)).toBeCloseTo(expected, 6);
  });

  it("is always faster than the approach velocity", () => {
    for (const vInf of [11_000, 20_000, 50_000, 72_000]) {
      expect(impactVelocity(vInf)).toBeGreaterThan(vInf);
    }
  });

  it("equals the escape velocity when v_inf = 0", () => {
    expect(impactVelocity(0)).toBeCloseTo(V_ESCAPE_EARTH, 6);
  });
});

describe("asteroidMass", () => {
  it("uses the sphere volume (π/6)·ρ·D³", () => {
    // 100 m stony sphere.
    const m = asteroidMass(100, DENSITY_STONY);
    const expected = (Math.PI / 6) * DENSITY_STONY * 100 ** 3;
    expect(m).toBeCloseTo(expected, 3);
  });

  it("scales with the cube of diameter", () => {
    const m1 = asteroidMass(50, DENSITY_STONY);
    const m2 = asteroidMass(100, DENSITY_STONY);
    expect(m2 / m1).toBeCloseTo(8, 6);
  });
});

describe("kineticEnergy / megaton conversion", () => {
  it("computes ½·m·v²", () => {
    expect(kineticEnergy(1000, 100)).toBeCloseTo(0.5 * 1000 * 100 ** 2, 6);
  });

  it("converts joules to megatons with the right constant", () => {
    expect(joulesToMegatons(J_PER_MEGATON)).toBeCloseTo(1, 9);
  });
});

describe("richterMagnitude", () => {
  it("matches the EIEP relation", () => {
    const e = 1e16;
    expect(richterMagnitude(e)).toBeCloseTo(0.67 * Math.log10(e) - 5.87, 6);
  });

  it("returns 0 for non-positive energy", () => {
    expect(richterMagnitude(0)).toBe(0);
  });
});

describe("craterDimensions", () => {
  it("produces a larger crater at steeper (more vertical) angles", () => {
    const shallow = craterDimensions(200, DENSITY_STONY, 20_000, 15);
    const steep = craterDimensions(200, DENSITY_STONY, 20_000, 90);
    expect(steep.transientDiameterM).toBeGreaterThan(shallow.transientDiameterM);
  });

  it("flags complex craters for very large impacts", () => {
    const big = craterDimensions(2000, DENSITY_STONY, 25_000, 45);
    expect(big.isComplex).toBe(true);
    expect(big.finalDiameterM).toBeGreaterThan(big.transientDiameterM);
  });

  it("treats small impacts as simple craters (final = 1.25·Dtc)", () => {
    const small = craterDimensions(50, DENSITY_STONY, 20_000, 45);
    expect(small.isComplex).toBe(false);
    expect(small.finalDiameterM).toBeCloseTo(1.25 * small.transientDiameterM, 6);
  });
});

describe("kineticImpactorDeflection", () => {
  it("computes Δv = β·m·v / M and a downrange shift that grows with lead time", () => {
    const r = kineticImpactorDeflection({
      impactorMassKg: 600,
      impactorVelocityMs: 6_000,
      asteroidMassKg: 1e10,
      leadTimeS: 1e7,
      beta: 3.6,
    });
    expect(r.deltaVMs).toBeCloseTo((3.6 * 600 * 6000) / 1e10, 12);
    expect(r.downrangeShiftM).toBeCloseTo(r.deltaVMs * 1e7, 6);
  });

  it("a longer lead time yields a bigger miss for the same Δv", () => {
    const base = {
      impactorMassKg: 600,
      impactorVelocityMs: 6_000,
      asteroidMassKg: 1e10,
      beta: 3.6,
    };
    const early = kineticImpactorDeflection({ ...base, leadTimeS: 5 * 365 * 86400 });
    const late = kineticImpactorDeflection({ ...base, leadTimeS: 7 * 86400 });
    expect(early.downrangeShiftM).toBeGreaterThan(late.downrangeShiftM);
  });
});

describe("SANITY: ~50 m stony asteroid at ~19 km/s ≈ Tunguska scale", () => {
  const res = computeImpact({
    diameterM: 50,
    densityKgM3: DENSITY_STONY,
    velocityKmS: 19,
    impactAngleDeg: 45,
  });

  it("lands in the low-megaton (Tunguska) range, ~5–30 Mt", () => {
    expect(res.energyMegatons).toBeGreaterThan(5);
    expect(res.energyMegatons).toBeLessThan(30);
  });

  it("has the escape-boosted impact velocity (> 19 km/s)", () => {
    expect(res.vImpactMs).toBeGreaterThan(19_000);
    expect(res.vImpactMs).toBeLessThan(25_000);
  });

  it("produces a plausible seismic magnitude (~4–6)", () => {
    expect(res.richter).toBeGreaterThan(4);
    expect(res.richter).toBeLessThan(6);
  });
});
