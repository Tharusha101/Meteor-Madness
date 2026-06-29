/**
 * EnergyComparison — where this impact lands among famous explosions/impacts,
 * on a log scale (energies span ~10 orders of magnitude). Uses recharts.
 */
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimStore } from "../store/useSimStore";
import { formatMegatons, REFERENCE_EVENTS } from "../lib/format";

interface Row {
  name: string;
  megatons: number;
  current: boolean;
  blurb: string;
}

function tickFormatter(v: number): string {
  if (v >= 1e6) return `${v / 1e6}M`;
  if (v >= 1e3) return `${v / 1e3}k`;
  if (v >= 1) return `${v}`;
  return `${v}`;
}

export function EnergyComparison() {
  const megatons = useSimStore((s) => s.results.energyMegatons);

  const rows: Row[] = [
    ...REFERENCE_EVENTS.map((e) => ({
      name: e.name,
      megatons: e.megatons,
      current: false,
      blurb: e.blurb,
    })),
    { name: "★ This impact", megatons, current: true, blurb: "your scenario" },
  ].sort((a, b) => a.megatons - b.megatons);

  const values = rows.map((r) => Math.max(r.megatons, 1e-6));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domainLow = 10 ** Math.floor(Math.log10(min));
  const domainHigh = 10 ** Math.ceil(Math.log10(max));

  return (
    <section className="rounded-xl border border-mission-border bg-mission-panel/80 p-5 backdrop-blur">
      <header className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
          Energy in context
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Megatons of TNT, log scale — your impact vs. known events
        </p>
      </header>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={rows}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            barCategoryGap={4}
          >
            <XAxis
              type="number"
              scale="log"
              domain={[domainLow, domainHigh]}
              allowDataOverflow
              tickFormatter={tickFormatter}
              tick={{ fill: "#64748b", fontSize: 10 }}
              stroke="#1b2735"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              stroke="#1b2735"
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
              contentStyle={{
                background: "#0f1622",
                border: "1px solid #1b2735",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value, _name, item) => [
                formatMegatons(Number(value)),
                (item?.payload as Row | undefined)?.blurb ?? "",
              ]}
            />
            <Bar dataKey="megatons" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.current ? "#fbbf24" : "#334155"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default EnergyComparison;
