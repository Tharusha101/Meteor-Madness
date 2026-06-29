/**
 * NASA NEO Web Service + JPL SBDB client.
 * PHASE 5: not implemented yet. Typed surface + a bundled fallback asteroid so
 * the rest of the app can depend on this module before the network code lands.
 *
 * NASA NEO:  https://api.nasa.gov/neo/rest/v1/   (key via VITE_NASA_API_KEY)
 * JPL SBDB:  https://ssd-api.jpl.nasa.gov/sbdb.api  (no key)
 *
 * Units (do NOT mix up): miss distance km, velocity km/s, semi-major axis AU.
 */
import type { ImpactParams } from "../physics";

export interface NeoSummary {
  id: string;
  name: string;
  /** Estimated diameter (m). */
  diameterM: number;
  /** Close-approach relative velocity (km/s). */
  velocityKmS: number;
}

/** A bundled real-ish asteroid so the tool works fully offline. */
export const FALLBACK_NEO: NeoSummary = {
  id: "2099942",
  name: "99942 Apophis (sample)",
  diameterM: 370,
  velocityKmS: 30.7,
};

/** Convert a NEO summary into simulator params (keeps default density/angle). */
export function neoToParams(
  neo: NeoSummary,
  base: ImpactParams,
): ImpactParams {
  return { ...base, diameterM: neo.diameterM, velocityKmS: neo.velocityKmS };
}

// TODO(phase 5): browseNeos(), getNeoById(), getSbdbElements() — all wrapped in
// try/catch with FALLBACK_NEO so the UI degrades gracefully when offline.
