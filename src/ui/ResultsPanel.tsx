/**
 * ResultsPanel — live-updating impact consequences derived from the store.
 * Reads `results` (already computed by the physics pipeline) and formats it.
 */
import { useSimStore } from "../store/useSimStore";
import { Term } from "./Term";
import {
  formatDistanceM,
  formatJoules,
  formatMagnitude,
  formatMegatons,
  formatNumber,
  formatVelocityMs,
  nearestQuake,
  tntComparison,
} from "../lib/format";

interface MetricProps {
  label: React.ReactNode;
  value: string;
  sub?: React.ReactNode;
  accent?: "cyan" | "amber" | "red";
}

function Metric({ label, value, sub, accent = "cyan" }: MetricProps) {
  const accentClass =
    accent === "amber"
      ? "text-accent-amber"
      : accent === "red"
        ? "text-accent-red"
        : "text-accent-cyan";
  return (
    <div className="rounded-lg border border-mission-border bg-mission-panel-2/60 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${accentClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</div>}
    </div>
  );
}

export function ResultsPanel() {
  const results = useSimStore((s) => s.results);
  const params = useSimStore((s) => s.params);

  const comparison = tntComparison(results.energyMegatons);
  const quake = nearestQuake(results.richter);
  const crater = results.crater;

  // Small stony bodies likely airburst rather than reaching the ground.
  const likelyAirburst = params.diameterM < 100 && params.densityKgM3 < 4000;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-mission-border bg-mission-panel/80 p-5 backdrop-blur">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
          Impact results
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Updates live as you adjust the impactor.
        </p>
      </header>

      <Metric
        label={<Term k="kineticEnergy">Kinetic energy</Term>}
        value={formatMegatons(results.energyMegatons)}
        sub={formatJoules(results.energyJ)}
        accent="amber"
      />

      <Metric
        label={<Term k="tntEquivalent">TNT-equivalent</Term>}
        value={`${formatNumber(comparison.hiroshimas)}× Hiroshima`}
        sub={comparison.sentence}
      />

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label={<Term k="crater">Crater</Term>}
          value={formatDistanceM(crater.finalDiameterM)}
          sub={`${crater.isComplex ? "complex" : "simple"} · depth ${formatDistanceM(
            crater.depthM,
          )}`}
        />
        <Metric
          label={<Term k="seismicMagnitude">Seismic</Term>}
          value={`M ${formatMagnitude(results.richter)}`}
          sub={quake.sentence}
          accent="red"
        />
      </div>

      <div className="rounded-lg border border-mission-border bg-mission-panel-2/60 p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <Term k="escapeVelocity">Impact velocity</Term>
        </div>
        <div className="mt-1 font-mono text-lg tabular-nums text-slate-200">
          {formatVelocityMs(results.vImpactMs)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {formatVelocityMs(results.vInfMs)} approach +{" "}
          Earth&rsquo;s gravity boost
        </div>
      </div>

      {likelyAirburst && (
        <p className="rounded-lg border border-accent-amber/40 bg-accent-amber/10 p-3 text-xs leading-relaxed text-accent-amber">
          ⚠ A stony body this small (&lt; ~100 m) would likely{" "}
          <Term k="airburst"><strong>airburst</strong></Term> in the atmosphere rather than form a ground
          crater (Chelyabinsk ≈ 20 m, Tunguska ≈ 50&ndash;60 m). Atmospheric
          entry isn&rsquo;t modeled yet — crater numbers assume ground impact.
        </p>
      )}
    </section>
  );
}

export default ResultsPanel;
