/**
 * USGS clients: elevation (ocean/land detection) + earthquake catalog.
 *
 * EPQS:        https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Meters
 * Quake cat.:  https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson
 *
 * No API key required. All calls are wrapped by callers in try/catch so the
 * tool degrades gracefully offline.
 */

export interface ElevationResult {
  /** Elevation at the point (m). ≤ 0 ≈ ocean -> tsunami branch (phase 4). */
  elevationM: number;
  /** True if the point is (approximately) ocean. */
  isOcean: boolean;
}

/**
 * Look up ground elevation at a lat/lon via USGS EPQS.
 * EPQS returns a large negative sentinel over ocean / no-data; we treat any
 * non-positive (or invalid) value as ocean.
 */
export async function getElevation(
  lat: number,
  lon: number,
): Promise<ElevationResult> {
  const url =
    `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}` +
    `&units=Meters&wkid=4326&includeDate=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPQS request failed: ${res.status}`);

  const data: unknown = await res.json();
  const raw = Number(
    (data as { value?: number | string } | null)?.value,
  );
  const valid = Number.isFinite(raw) && raw > -1e6;
  const elevationM = valid ? raw : 0;

  return { elevationM, isOcean: !valid || elevationM <= 0 };
}

// TODO(phase 5): getReferenceQuakes(minMagnitude) via the earthquake catalog,
// to compare an impact's seismic magnitude against real earthquakes.
