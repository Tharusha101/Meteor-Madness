/**
 * ImpactMap — 2D Leaflet map (phase 3).
 * Click to set the impact point; draw the crater + blast/thermal rings; look up
 * USGS elevation for ocean/land detection. When deflection is active (phase 4),
 * also shows where the impact point moves to — or that the asteroid misses.
 */
import "leaflet/dist/leaflet.css";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMapEvents,
} from "react-leaflet";
import { blastRings, EARTH_RADIUS_M } from "../physics";
import { useDeflectionResult, useSimStore } from "../store/useSimStore";
import { formatDistanceM } from "../lib/format";

const METERS_PER_DEG_LAT = 111_320;

function ClickHandler() {
  const setImpactLatLng = useSimStore((s) => s.setImpactLatLng);
  const fetchElevation = useSimStore((s) => s.fetchElevation);
  useMapEvents({
    click(e) {
      const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
      setImpactLatLng(ll);
      void fetchElevation(ll);
    },
  });
  return null;
}

function StatusOverlay() {
  const impact = useSimStore((s) => s.impactLatLng);
  const status = useSimStore((s) => s.elevationStatus);
  const elevation = useSimStore((s) => s.elevation);
  const deflection = useDeflectionResult();

  if (!impact) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
        <span className="rounded-full border border-mission-border bg-mission-panel/90 px-3 py-1 text-[11px] text-slate-300">
          Click anywhere on the map to drop an impact
        </span>
      </div>
    );
  }

  let terrain = "Locating…";
  if (status === "ready" && elevation) {
    terrain = elevation.isOcean
      ? "🌊 Ocean impact"
      : `🏔 Land · ${formatDistanceM(elevation.elevationM)} elevation`;
  } else if (status === "error") {
    terrain = "Terrain lookup offline";
  }

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-[500] space-y-1 rounded-lg border border-mission-border bg-mission-panel/90 px-3 py-2 text-[11px] text-slate-300">
      <div className="font-mono text-accent-cyan">
        {impact.lat.toFixed(3)}, {impact.lng.toFixed(3)}
      </div>
      <div>{terrain}</div>
      {deflection.enabled && (
        <div className={deflection.isMiss ? "text-emerald-400" : "text-accent-amber"}>
          {deflection.isMiss
            ? "✓ Deflected — misses Earth"
            : `Impact shifted ${formatDistanceM(deflection.downrangeShiftM)}`}
        </div>
      )}
    </div>
  );
}

function ImpactOverlays() {
  const impact = useSimStore((s) => s.impactLatLng);
  const results = useSimStore((s) => s.results);
  const deflection = useDeflectionResult();
  if (!impact) return null;

  const rings = blastRings(results.energyMegatons);
  const craterRadiusM = results.crater.finalDiameterM / 2;

  // Deflected impact point: shift north by the downrange distance.
  const shiftDeg = deflection.downrangeShiftM / METERS_PER_DEG_LAT;
  const deflectedLat = Math.max(-85, Math.min(85, impact.lat + shiftDeg));
  const showDeflected =
    deflection.enabled &&
    !deflection.isMiss &&
    deflection.downrangeShiftM < EARTH_RADIUS_M;

  return (
    <>
      {/* Blast / thermal rings (largest first). */}
      {rings.map((ring) => (
        <Circle
          key={ring.key}
          center={[impact.lat, impact.lng]}
          radius={ring.radiusM}
          pathOptions={{
            color: ring.color,
            weight: 1,
            fillColor: ring.color,
            fillOpacity: 0.07,
          }}
        >
          <LeafletTooltip>
            {ring.label} — {formatDistanceM(ring.radiusM)} radius
          </LeafletTooltip>
        </Circle>
      ))}

      {/* Crater. */}
      <Circle
        center={[impact.lat, impact.lng]}
        radius={craterRadiusM}
        pathOptions={{
          color: "#7f1d1d",
          weight: 1.5,
          fillColor: "#450a0a",
          fillOpacity: 0.5,
        }}
      >
        <LeafletTooltip>
          Crater — {formatDistanceM(results.crater.finalDiameterM)} across
        </LeafletTooltip>
      </Circle>

      {/* Ground zero. */}
      <CircleMarker
        center={[impact.lat, impact.lng]}
        radius={4}
        pathOptions={{ color: "#fff", fillColor: "#f87171", fillOpacity: 1, weight: 1 }}
      />

      {/* Deflected impact point. */}
      {showDeflected && (
        <>
          <Polyline
            positions={[
              [impact.lat, impact.lng],
              [deflectedLat, impact.lng],
            ]}
            pathOptions={{ color: "#34d399", weight: 1.5, dashArray: "6 6" }}
          />
          <CircleMarker
            center={[deflectedLat, impact.lng]}
            radius={5}
            pathOptions={{ color: "#fff", fillColor: "#34d399", fillOpacity: 1, weight: 1 }}
          >
            <LeafletTooltip>New impact point after deflection</LeafletTooltip>
          </CircleMarker>
        </>
      )}
    </>
  );
}

export function ImpactMap() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-mission-border bg-mission-panel/80">
      <StatusOverlay />
      <div className="h-[360px] w-full">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          worldCopyJump
          style={{ height: "100%", width: "100%", background: "#05070a" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <ClickHandler />
          <ImpactOverlays />
        </MapContainer>
      </div>
    </section>
  );
}

export default ImpactMap;
