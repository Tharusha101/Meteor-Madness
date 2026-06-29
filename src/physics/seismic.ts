/**
 * Seismic effect of an impact.
 *
 * Converts impact energy (joules) to an equivalent Richter magnitude using the
 * EIEP relation (Collins et al. 2005):
 *
 *   M = 0.67 · log10(E_J) − 5.87
 */

/** Equivalent seismic (Richter) magnitude for a given impact energy (joules). */
export function richterMagnitude(energyJ: number): number {
  if (energyJ <= 0) return 0;
  return 0.67 * Math.log10(energyJ) - 5.87;
}
