/**
 * App shell — "mission control" layout.
 * Left: impactor + mitigation controls. Center: 3D orbit + impact map.
 * Right: live impact results.
 */
import { useState } from "react";
import ControlPanel from "./ui/ControlPanel";
import ResultsPanel from "./ui/ResultsPanel";
import MitigationPanel from "./ui/MitigationPanel";
import EnergyComparison from "./ui/EnergyComparison";
import DefendEarth from "./ui/DefendEarth";
import DefendArcade from "./ui/DefendArcade";
import OrbitView from "./scene/OrbitView";
import ImpactMap from "./map/ImpactMap";

function App() {
  const [defendOpen, setDefendOpen] = useState(false);
  const [arcadeOpen, setArcadeOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-200">
      <header className="border-b border-mission-border bg-mission-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☄️</span>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-slate-100">
                Meteor Madness
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-accent-cyan">
                Asteroid Impact Simulator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setArcadeOpen(true)}
              className="rounded-lg border border-accent-amber bg-accent-amber/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-amber transition hover:bg-accent-amber/20"
            >
              🕹️ Arcade
            </button>
            <button
              onClick={() => setDefendOpen(true)}
              className="rounded-lg border border-accent-cyan bg-accent-cyan/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
            >
              🛡️ Defend Earth
            </button>
            <div className="hidden text-right text-[11px] uppercase tracking-wider text-slate-500 sm:block">
              NASA Space Apps · NEO + USGS data
              <span className="ml-3 rounded-full border border-mission-border px-2 py-0.5 text-accent-amber">
                MVP · Phases 1–6
              </span>
            </div>
          </div>
        </div>
      </header>

      <DefendEarth open={defendOpen} onClose={() => setDefendOpen(false)} />
      <DefendArcade open={arcadeOpen} onClose={() => setArcadeOpen(false)} />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: controls */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <ControlPanel />
            <MitigationPanel />
          </div>

          {/* Center: visuals */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <OrbitView />
            <ImpactMap />
            <EnergyComparison />
          </div>

          {/* Right: results */}
          <div className="lg:col-span-3">
            <ResultsPanel />
          </div>
        </div>

        <footer className="mt-8 text-center text-[11px] leading-relaxed text-slate-600">
          Physics: Collins, Melosh &amp; Marcus (2005), &ldquo;Earth Impact
          Effects Program.&rdquo; Estimates only — atmospheric entry is not
          modeled; blast rings and deflection shift are simplified.
        </footer>
      </main>
    </div>
  );
}

export default App;
