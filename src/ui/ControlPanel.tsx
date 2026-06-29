/**
 * ControlPanel — sliders that drive the simulation.
 * Diameter, density, velocity (v_inf) and impact angle. Density also has quick
 * material presets. Every change flows through the Zustand store, which re-runs
 * the physics so the ResultsPanel updates live.
 */
import type { ReactNode } from "react";
import {
  DENSITY_COMET,
  DENSITY_IRON,
  DENSITY_STONY,
} from "../physics";
import { useSimStore, type ParamKey } from "../store/useSimStore";
import { formatNumber } from "../lib/format";
import { Term } from "./Term";

interface SliderRowProps {
  label: ReactNode;
  paramKey: ParamKey;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Optional override for how the live value is displayed. */
  display?: string;
}

function SliderRow({
  label,
  paramKey,
  value,
  min,
  max,
  step,
  unit,
  display,
}: SliderRowProps) {
  const setParam = useSimStore((s) => s.setParam);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={paramKey}
          className="text-xs font-medium uppercase tracking-wider text-slate-400"
        >
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-accent-cyan">
          {display ?? formatNumber(value)}
          <span className="ml-1 text-[11px] text-slate-500">{unit}</span>
        </span>
      </div>
      <input
        id={paramKey}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setParam(paramKey, Number(e.target.value))}
      />
    </div>
  );
}

const DENSITY_PRESETS: { label: string; value: number }[] = [
  { label: "Comet / ice", value: DENSITY_COMET },
  { label: "Rock", value: DENSITY_STONY },
  { label: "Iron", value: DENSITY_IRON },
];

export function ControlPanel() {
  const params = useSimStore((s) => s.params);
  const setParam = useSimStore((s) => s.setParam);
  const reset = useSimStore((s) => s.reset);

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-mission-border bg-mission-panel/80 p-5 backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
          Impactor
        </h2>
        <button
          onClick={reset}
          className="rounded border border-mission-border px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400 transition hover:border-accent-cyan hover:text-accent-cyan"
        >
          Reset
        </button>
      </header>

      <SliderRow
        label={<Term k="diameter">Diameter</Term>}
        paramKey="diameterM"
        value={params.diameterM}
        min={1}
        max={5000}
        step={1}
        unit="m"
      />

      <div className="space-y-2">
        <SliderRow
          label={<Term k="density">Density</Term>}
          paramKey="densityKgM3"
          value={params.densityKgM3}
          min={1000}
          max={8000}
          step={50}
          unit="kg/m³"
        />
        <div className="flex gap-2">
          {DENSITY_PRESETS.map((p) => {
            const active = Math.abs(params.densityKgM3 - p.value) < 1;
            return (
              <button
                key={p.label}
                onClick={() => setParam("densityKgM3", p.value)}
                className={`flex-1 rounded border px-2 py-1 text-[11px] transition ${
                  active
                    ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                    : "border-mission-border text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <SliderRow
        label={<Term k="velocity">Velocity (v∞)</Term>}
        paramKey="velocityKmS"
        value={params.velocityKmS}
        min={11}
        max={72}
        step={0.1}
        unit="km/s"
      />

      <SliderRow
        label={<Term k="impactAngle">Impact angle</Term>}
        paramKey="impactAngleDeg"
        value={params.impactAngleDeg}
        min={5}
        max={90}
        step={1}
        unit="° from horiz."
      />

      <p className="text-[11px] leading-relaxed text-slate-500">
        Velocity is the relative speed far from Earth; the surface impact speed is
        boosted by Earth&rsquo;s gravity. 45&deg; is the most likely impact angle.
      </p>
    </section>
  );
}

export default ControlPanel;
