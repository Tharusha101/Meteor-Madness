import { describe, it, expect } from "vitest";
import { blastRings } from "../src/physics";

describe("blastRings", () => {
  it("returns rings sorted largest-radius first", () => {
    const rings = blastRings(10);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i - 1].radiusM).toBeGreaterThanOrEqual(rings[i].radiusM);
    }
  });

  it("scales radii with the cube root of energy", () => {
    const one = blastRings(1);
    const eight = blastRings(8); // cube root of 8 = 2 -> 2x radii
    for (const ring of one) {
      const match = eight.find((r) => r.key === ring.key)!;
      expect(match.radiusM).toBeCloseTo(ring.radiusM * 2, 3);
    }
  });

  it("produces sane radii for a 1 Mt event (km scale)", () => {
    const rings = blastRings(1);
    const light = rings.find((r) => r.key === "light")!;
    expect(light.radiusM).toBeGreaterThan(10_000);
    expect(light.radiusM).toBeLessThan(20_000);
  });

  it("collapses all rings to 0 for zero energy", () => {
    for (const ring of blastRings(0)) {
      expect(ring.radiusM).toBe(0);
    }
  });
});
