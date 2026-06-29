/**
 * MitigationPanel — kinetic-impactor deflection (phase 4).
 * Sliders for impactor mass, speed, lead time and β feed physics/deflection.ts;
 * the resulting Δv and downrange shift are shown here and drawn on the map.
 * The lead-time slider is deliberately dramatic to teach the key lesson:
 * a tiny Δv applied years early beats a huge Δv applied days before impact.
 */
import type { ReactNode } from "react";
import {
  useDeflectionResult,
  useSimStore,
  type DeflectionInputs,
} from "../store/useSimStore";
import { formatDistanceM, formatNumber } from "../lib/format";
import { Term } from "./Term";

interface DeflectionSliderProps {
  label: ReactNode;
  field: keyof Omit<DeflectionInputs, "enabled">;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  display: string;
}

function DeflectionSlider({
  label,
  field,
  value,
  min,
  max,
  step,
  unit,
  display,
}: DeflectionSliderProps) {
  const setDeflection = useSimStore((s) => s.setDeflection);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-accent-cyan">
          {display}
          <span className="ml-1 text-[11px] text-slate-500">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setDeflection({ [field]: Number(e.target.value) })}
      />
    </div>
  );
}

/** Δv is tiny — show mm/s when sub-m/s for readability. */
function formatDeltaV(deltaVMs: number): string {
  if (deltaVMs < 1) return `${formatNumber(deltaVMs * 1000)} mm/s`;
  return `${formatNumber(deltaVMs)} m/s`;
}

export function MitigationPanel() {
  const deflection = useSimStore((s) => s.deflection);
  const setDeflection = useSimStore((s) => s.setDeflection);
  const impactPlaced = useSimStore((s) => s.impactLatLng !== null);
  const outcome = useDeflectionResult();

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-mission-border bg-mission-panel/80 p-5 backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
            Mitigation
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            <Term k="kineticImpactor">Kinetic impactor</Term> (DART-style)
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400">
          <input
            type="checkbox"
            checked={deflection.enabled}
            onChange={(e) => setDeflection({ enabled: e.target.checked })}
            className="h-4 w-4 accent-cyan-400"
          />
          {deflection.enabled ? "Armed" : "Off"}
        </label>
      </header>

      <div
        className={`flex flex-col gap-4 transition ${
          deflection.enabled ? "opacity-100" : "pointer-events-none opacity-40"
        }`}
      >
        <DeflectionSlider
          label="Impactor mass"
          field="impactorMassKg"
          value={deflection.impactorMassKg}
          min={100}
          max={5000}
          step={10}
          unit="kg"
          display={formatNumber(deflection.impactorMassKg)}
        />
        <DeflectionSlider
          label="Impactor speed"
          field="impactorVelocityKmS"
          value={deflection.impactorVelocityKmS}
          min={1}
          max={30}
          step={0.1}
          unit="km/s"
          display={formatNumber(deflection.impactorVelocityKmS)}
        />
        <DeflectionSlider
          label={<Term k="leadTime">Lead time</Term>}
          field="leadTimeYears"
          value={deflection.leadTimeYears}
          min={0.05}
          max={25}
          step={0.05}
          unit="yr before impact"
          display={formatNumber(deflection.leadTimeYears)}
        />
        <DeflectionSlider
          label={<Term k="beta">Momentum factor β</Term>}
          field="beta"
          value={deflection.beta}
          min={1}
          max={5}
          step={0.1}
          unit="(DART ≈ 3.6)"
          display={formatNumber(deflection.beta)}
        />
      </div>

      {/* Outcome */}
      <div
        className={`grid grid-cols-2 gap-3 ${
          deflection.enabled ? "" : "opacity-40"
        }`}
      >
        <div className="rounded-lg border border-mission-border bg-mission-panel-2/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            <Term k="deltaV">Δv imparted</Term>
          </div>
          <div className="mt-1 font-mono text-lg tabular-nums text-accent-cyan">
            {formatDeltaV(outcome.deltaVMs)}
          </div>
        </div>
        <div className="rounded-lg border border-mission-border bg-mission-panel-2/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Impact shift</div>
          <div className="mt-1 font-mono text-lg tabular-nums text-accent-cyan">
            {formatDistanceM(outcome.downrangeShiftM)}
          </div>
        </div>
      </div>

      {deflection.enabled && (
        <div
          className={`rounded-lg border p-3 text-center text-sm font-semibold uppercase tracking-wider ${
            outcome.isMiss
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-accent-red/40 bg-accent-red/10 text-accent-red"
          }`}
        >
          {outcome.isMiss ? "✓ Earth saved — asteroid misses" : "✗ Still a direct hit"}
          {!outcome.isMiss && impactPlaced && (
            <span className="mt-1 block text-[11px] font-normal normal-case text-slate-400">
              The impact point moved — see the green marker on the map.
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        Lesson: a tiny nudge applied <strong>years early</strong> beats a huge
        one applied days before impact — push the lead-time slider and watch the
        miss distance explode.
      </p>
    </section>
  );
}

export default MitigationPanel;
