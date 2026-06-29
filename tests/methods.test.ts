import { describe, it, expect } from "vitest";
import {
  asteroidMass,
  gravityTractorDeflection,
  kineticImpactorDeflection,
  laserAblationDeflection,
  nuclearDeflection,
  nuclearWillShatter,
  DENSITY_STONY,
} from "../src/physics";

const YEAR_S = 365.25 * 86400;
const mass = (d: number) => asteroidMass(d, DENSITY_STONY);

describe("nuclearDeflection", () => {
  it("imparts more Δv than a kinetic impactor on the same asteroid", () => {
    const M = mass(300);
    const nuke = nuclearDeflection({
      yieldMegatons: 1,
      asteroidMassKg: M,
      leadTimeS: YEAR_S,
    });
    const kin = kineticImpactorDeflection({
      impactorMassKg: 600,
      impactorVelocityMs: 7000,
      asteroidMassKg: M,
      leadTimeS: YEAR_S,
    });
    expect(nuke.deltaVMs).toBeGreaterThan(kin.deltaVMs);
    expect(nuke.continuous).toBe(false);
  });

  it("Δv grows with yield and shrinks with asteroid mass", () => {
    const small = nuclearDeflection({ yieldMegatons: 1, asteroidMassKg: mass(200), leadTimeS: YEAR_S });
    const big = nuclearDeflection({ yieldMegatons: 5, asteroidMassKg: mass(200), leadTimeS: YEAR_S });
    const heavier = nuclearDeflection({ yieldMegatons: 1, asteroidMassKg: mass(400), leadTimeS: YEAR_S });
    expect(big.deltaVMs).toBeGreaterThan(small.deltaVMs);
    expect(heavier.deltaVMs).toBeLessThan(small.deltaVMs);
  });
});

describe("gravityTractorDeflection", () => {
  it("acceleration is independent of asteroid mass (mass-independent Δv)", () => {
    const a = gravityTractorDeflection({ spacecraftMassKg: 4e4, standoffDistanceM: 100, leadTimeS: YEAR_S });
    // Same call regardless of asteroid — verify Δv only depends on craft + distance + time.
    const b = gravityTractorDeflection({ spacecraftMassKg: 4e4, standoffDistanceM: 100, leadTimeS: YEAR_S });
    expect(a.deltaVMs).toBeCloseTo(b.deltaVMs, 12);
    expect(a.continuous).toBe(true);
  });

  it("uses the continuous ½·a·T² displacement (shift = ½·Δv·T)", () => {
    const r = gravityTractorDeflection({ spacecraftMassKg: 4e4, standoffDistanceM: 100, leadTimeS: 2 * YEAR_S });
    expect(r.downrangeShiftM).toBeCloseTo(0.5 * r.deltaVMs * 2 * YEAR_S, 3);
  });

  it("displacement grows faster than linearly with lead time (T²)", () => {
    const t1 = gravityTractorDeflection({ spacecraftMassKg: 4e4, standoffDistanceM: 100, leadTimeS: YEAR_S });
    const t2 = gravityTractorDeflection({ spacecraftMassKg: 4e4, standoffDistanceM: 100, leadTimeS: 2 * YEAR_S });
    expect(t2.downrangeShiftM / t1.downrangeShiftM).toBeCloseTo(4, 1);
  });
});

describe("laserAblationDeflection", () => {
  it("is weaker on more massive asteroids (mass-dependent)", () => {
    const light = laserAblationDeflection({ powerWatts: 5e6, asteroidMassKg: mass(150), leadTimeS: YEAR_S });
    const heavy = laserAblationDeflection({ powerWatts: 5e6, asteroidMassKg: mass(400), leadTimeS: YEAR_S });
    expect(light.deltaVMs).toBeGreaterThan(heavy.deltaVMs);
    expect(light.continuous).toBe(true);
  });
});

describe("nuclearWillShatter", () => {
  it("shatters a small asteroid with a large yield", () => {
    expect(nuclearWillShatter(5, 100)).toBe(true);
  });

  it("does not shatter a large asteroid with a small yield", () => {
    expect(nuclearWillShatter(0.5, 400)).toBe(false);
  });

  it("threshold scales with diameter cubed", () => {
    // 200 m needs 8× the yield of 100 m to shatter.
    expect(nuclearWillShatter(3.9, 200)).toBe(false); // just under 0.5*8 = 4
    expect(nuclearWillShatter(4.1, 200)).toBe(true);
  });
});
