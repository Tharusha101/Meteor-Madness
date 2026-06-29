import { describe, it, expect } from "vitest";
import {
  nearestQuake,
  tntComparison,
  formatMegatons,
  REFERENCE_QUAKES,
} from "../src/lib/format";

describe("nearestQuake", () => {
  it("matches a great impact to the largest recorded quakes", () => {
    const { quake } = nearestQuake(9.4);
    expect(quake.magnitude).toBeGreaterThanOrEqual(9.1);
  });

  it("matches a small impact to a minor tremor", () => {
    const { quake } = nearestQuake(3.4);
    expect(quake.magnitude).toBeLessThan(5);
  });

  it("always returns one of the reference quakes with a sentence", () => {
    const { quake, sentence } = nearestQuake(7.1);
    expect(REFERENCE_QUAKES).toContain(quake);
    expect(sentence).toMatch(/^≈ M\d/);
  });
});

describe("tntComparison", () => {
  it("counts Hiroshima bombs correctly", () => {
    // 0.15 Mt = 10 Hiroshimas (Hiroshima ≈ 0.015 Mt).
    expect(tntComparison(0.15).hiroshimas).toBeCloseTo(10, 6);
  });

  it("pegs ~12 Mt to Tunguska", () => {
    expect(tntComparison(12).nearest.name).toBe("Tunguska event");
  });
});

describe("formatMegatons", () => {
  it("scales down to kilotons and tons", () => {
    expect(formatMegatons(0.5)).toMatch(/kiloton/);
    expect(formatMegatons(0.0005)).toMatch(/ton/);
  });
});
