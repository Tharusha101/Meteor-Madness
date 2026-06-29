/**
 * DefendEarth — timed planetary-defense strategy game (phase 6 stretch).
 *
 * Each round an asteroid is inbound. You choose ONE of the four real-world
 * deflection strategies — kinetic impactor, nuclear standoff, gravity tractor,
 * or laser ablation — tune it, and deploy before the clock (which burns your
 * available lead time) runs out. Different threats demand different methods:
 *   • small/medium + some warning → kinetic impactor
 *   • huge or last-minute        → nuclear (but too much yield SHATTERS small
 *                                  rocks, which only helps with enough warning)
 *   • lots of warning, any size  → gravity tractor (mass-independent, slow)
 *   • long warning, lighter rock → laser ablation
 *
 * Reuses the tested physics in physics/deflection.ts. 2D only (reliable).
 */
import { useCallback, useEffect, useState } from "react";
import {
  asteroidMass,
  computeImpact,
  EARTH_RADIUS_M,
  gravityTractorDeflection,
  kineticImpactorDeflection,
  laserAblationDeflection,
  nuclearDeflection,
  nuclearWillShatter,
  type DeflectionMethod,
} from "../physics";
import { formatDistanceM, formatMegatons, formatNumber, tntComparison } from "../lib/format";

const YEAR_S = 365.25 * 86400;
const DISPERSE_YEARS = 2; // warning needed for shattered fragments to clear Earth

type Phase = "intro" | "playing" | "result";

interface Threat {
  round: number;
  diameterM: number;
  velocityKmS: number;
  densityKgM3: number;
  leadTimeYearsStart: number;
  roundSeconds: number;
}

interface Outcome {
  method: DeflectionMethod | "none";
  success: boolean;
  shattered: boolean;
  deltaVMs: number;
  shiftM: number;
  leadYears: number;
  energyMt: number;
  reason: "deflected" | "dispersed" | "short" | "fragmented" | "timeout";
}

interface MethodInfo {
  id: DeflectionMethod;
  name: string;
  icon: string;
  tagline: string;
  bestFor: string;
}

const METHODS: MethodInfo[] = [
  {
    id: "kinetic",
    name: "Kinetic Impactor",
    icon: "🚀",
    tagline: "Slam a probe into it",
    bestFor: "Small-to-medium rocks with a few years' warning (NASA's DART).",
  },
  {
    id: "nuclear",
    name: "Nuclear Standoff",
    icon: "☢️",
    tagline: "Ablate the surface",
    bestFor: "Huge or last-minute threats. Too much yield SHATTERS a small rock — only safe with ≥2 yr warning.",
  },
  {
    id: "gravity",
    name: "Gravity Tractor",
    icon: "🛰️",
    tagline: "Tug with gravity",
    bestFor: "Early detection. Works on ANY size — but needs many years.",
  },
  {
    id: "laser",
    name: "Laser Ablation",
    icon: "🔦",
    tagline: "Vaporize a plume",
    bestFor: "Long lead times; struggles with very massive rocks.",
  },
];

function makeThreat(round: number): Threat {
  const r = Math.random();
  const maxLead = Math.max(3, 14 - round * 0.8);
  return {
    round,
    diameterM: Math.round(80 + r * Math.min(420, 60 + round * 35)),
    velocityKmS: Number((15 + Math.random() * 15).toFixed(1)),
    densityKgM3: 3000,
    leadTimeYearsStart: Number((1.5 + Math.random() * (maxLead - 1.5)).toFixed(1)),
    roundSeconds: Number(Math.max(8, 14 - round * 0.4).toFixed(1)),
  };
}

const BEST_KEY = "meteor-madness:defend-best";

interface DefendEarthProps {
  open: boolean;
  onClose: () => void;
}

export function DefendEarth({ open, onClose }: DefendEarthProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [threat, setThreat] = useState<Threat>(() => makeThreat(1));
  const [timeLeft, setTimeLeft] = useState(0);
  const [method, setMethod] = useState<DeflectionMethod | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Per-method tuning.
  const [kineticMass, setKineticMass] = useState(1500);
  const [yieldMt, setYieldMt] = useState(2);
  const [tractorMass, setTractorMass] = useState(30000);
  const [laserMW, setLaserMW] = useState(4);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) ?? "0");
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  // Reset to intro whenever the modal closes (also stops the countdown).
  useEffect(() => {
    if (!open) setPhase("intro");
  }, [open]);

  const startRound = useCallback((round: number) => {
    const t = makeThreat(round);
    setThreat(t);
    setMethod(null);
    setOutcome(null);
    setTimeLeft(t.roundSeconds);
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    startRound(1);
  }, [startRound]);

  const energyMt = computeImpact({
    diameterM: threat.diameterM,
    densityKgM3: threat.densityKgM3,
    velocityKmS: threat.velocityKmS,
    impactAngleDeg: 45,
  }).energyMegatons;

  const massKg = asteroidMass(threat.diameterM, threat.densityKgM3);
  const remainingLeadYears = Math.max(
    0,
    threat.leadTimeYearsStart * (timeLeft / threat.roundSeconds),
  );

  /** Live prediction for the currently-selected method. */
  function predict(m: DeflectionMethod, leadYears: number) {
    const leadS = leadYears * YEAR_S;
    let deltaVMs = 0;
    let shiftM = 0;
    if (m === "kinetic") {
      const o = kineticImpactorDeflection({
        impactorMassKg: kineticMass,
        impactorVelocityMs: 7000,
        asteroidMassKg: massKg,
        leadTimeS: leadS,
      });
      deltaVMs = o.deltaVMs;
      shiftM = o.downrangeShiftM;
    } else if (m === "nuclear") {
      const o = nuclearDeflection({ yieldMegatons: yieldMt, asteroidMassKg: massKg, leadTimeS: leadS });
      deltaVMs = o.deltaVMs;
      shiftM = o.downrangeShiftM;
    } else if (m === "gravity") {
      const o = gravityTractorDeflection({ spacecraftMassKg: tractorMass, standoffDistanceM: 100, leadTimeS: leadS });
      deltaVMs = o.deltaVMs;
      shiftM = o.downrangeShiftM;
    } else {
      const o = laserAblationDeflection({ powerWatts: laserMW * 1e6, asteroidMassKg: massKg, leadTimeS: leadS });
      deltaVMs = o.deltaVMs;
      shiftM = o.downrangeShiftM;
    }
    const shattered = m === "nuclear" && nuclearWillShatter(yieldMt, threat.diameterM);
    const success = shattered ? leadYears >= DISPERSE_YEARS : shiftM >= EARTH_RADIUS_M;
    return { deltaVMs, shiftM, shattered, success };
  }

  const finishGame = useCallback(
    (finalScore: number) => {
      if (finalScore > best) {
        setBest(finalScore);
        localStorage.setItem(BEST_KEY, String(finalScore));
      }
    },
    [best],
  );

  const deploy = useCallback(() => {
    if (phase !== "playing" || !method) return;
    const p = predict(method, remainingLeadYears);
    const reason: Outcome["reason"] = p.shattered
      ? p.success
        ? "dispersed"
        : "fragmented"
      : p.success
        ? "deflected"
        : "short";
    const result: Outcome = {
      method,
      success: p.success,
      shattered: p.shattered,
      deltaVMs: p.deltaVMs,
      shiftM: p.shiftM,
      leadYears: remainingLeadYears,
      energyMt,
      reason,
    };
    setOutcome(result);
    setPhase("result");
    if (p.success) setScore((s) => s + 1);
    else finishGame(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, method, remainingLeadYears, energyMt, score, finishGame]);

  // Countdown.
  useEffect(() => {
    if (!open || phase !== "playing") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, Number((t - 0.1).toFixed(2))));
    }, 100);
    return () => window.clearInterval(id);
  }, [open, phase, threat]);

  // Timeout = the asteroid hits before you deployed.
  useEffect(() => {
    if (open && phase === "playing" && timeLeft <= 0 && threat.roundSeconds > 0) {
      setOutcome({
        method: "none",
        success: false,
        shattered: false,
        deltaVMs: 0,
        shiftM: 0,
        leadYears: 0,
        energyMt,
        reason: "timeout",
      });
      setPhase("result");
      finishGame(score);
    }
  }, [open, timeLeft, phase, threat, energyMt, score, finishGame]);

  // Keyboard: Esc closes, Enter deploys.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && phase === "playing" && method) {
        e.preventDefault();
        deploy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, method, deploy, onClose]);

  if (!open) return null;

  const live = method ? predict(method, remainingLeadYears) : null;
  const progress = 1 - timeLeft / threat.roundSeconds;
  const asteroidLeft = `${8 + Math.min(1, Math.max(0, progress)) * 70}%`;
  const selectedInfo = METHODS.find((m) => m.id === method);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-mission-border bg-mission-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mission-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-100">
              Defend Earth
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider text-slate-400">
            <span>Score <span className="font-mono text-accent-cyan">{score}</span></span>
            <span>Best <span className="font-mono text-accent-amber">{best}</span></span>
            <button
              onClick={onClose}
              className="rounded border border-mission-border px-2 py-1 transition hover:border-accent-red hover:text-accent-red"
            >
              ✕ Esc
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {phase === "intro" && (
            <div className="space-y-4 text-center">
              <p className="text-5xl">☄️🌍</p>
              <h3 className="text-lg font-semibold text-slate-100">Mission control online</h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
                Asteroids are inbound. For each, pick the right{" "}
                <strong className="text-accent-cyan">deflection method</strong>, tune it,
                and deploy before the clock runs out. The clock{" "}
                <strong className="text-accent-amber">burns your lead time</strong>, so act
                early — and match the method to the threat.
              </p>
              <div className="mx-auto grid max-w-md grid-cols-2 gap-2 text-left text-[11px] text-slate-400">
                {METHODS.map((m) => (
                  <div key={m.id} className="rounded-lg border border-mission-border bg-mission-panel-2/50 p-2">
                    <div className="text-slate-200">{m.icon} {m.name}</div>
                    <div className="mt-0.5 text-slate-500">{m.tagline}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startGame}
                className="rounded-lg border border-accent-cyan bg-accent-cyan/10 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
              >
                ▶ Start mission
              </button>
            </div>
          )}

          {phase === "playing" && (
            <div className="space-y-4">
              {/* Clock */}
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                <span>Threat #{threat.round}</span>
                <span className="font-mono text-accent-amber">⏱ {timeLeft.toFixed(1)}s</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-mission-border">
                <div
                  className="h-full bg-accent-amber transition-[width] duration-100 ease-linear"
                  style={{ width: `${(timeLeft / threat.roundSeconds) * 100}%` }}
                />
              </div>

              {/* Approach track */}
              <div className="relative h-12 overflow-hidden rounded-lg border border-mission-border bg-mission-bg">
                <div
                  className="absolute top-1/2 -translate-y-1/2 text-xl transition-[left] duration-100 ease-linear"
                  style={{ left: asteroidLeft }}
                >
                  ☄️
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">🌍</div>
              </div>

              {/* Threat stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Diameter" value={`${formatNumber(threat.diameterM)} m`} />
                <Stat label="Speed" value={`${formatNumber(threat.velocityKmS)} km/s`} />
                <Stat label="If it hits" value={formatMegatons(energyMt)} accent="amber" />
              </div>

              {/* Method selector */}
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                  Choose your defense
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map((m) => {
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                          active
                            ? "border-accent-cyan bg-accent-cyan/10"
                            : "border-mission-border hover:border-slate-500"
                        }`}
                      >
                        <span className="text-lg">{m.icon}</span>
                        <span className={`text-[10px] leading-tight ${active ? "text-accent-cyan" : "text-slate-400"}`}>
                          {m.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected method controls */}
              {selectedInfo && (
                <div className="space-y-3 rounded-lg border border-mission-border bg-mission-panel-2/50 p-4">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    <span className="text-slate-200">{selectedInfo.icon} {selectedInfo.name}.</span>{" "}
                    {selectedInfo.bestFor}
                  </p>
                  {method === "kinetic" && (
                    <GameSlider label="Impactor mass" value={kineticMass} min={300} max={6000} step={50} unit="kg" onChange={setKineticMass} />
                  )}
                  {method === "nuclear" && (
                    <GameSlider label="Warhead yield" value={yieldMt} min={0.1} max={50} step={0.1} unit="Mt" onChange={setYieldMt} />
                  )}
                  {method === "gravity" && (
                    <GameSlider label="Tractor mass" value={tractorMass} min={5000} max={60000} step={1000} unit="kg" onChange={setTractorMass} />
                  )}
                  {method === "laser" && (
                    <GameSlider label="Beam power" value={laserMW} min={0.1} max={10} step={0.1} unit="MW" onChange={setLaserMW} />
                  )}
                </div>
              )}

              {/* Live prediction */}
              <div className="rounded-lg border border-mission-border bg-mission-panel-2/50 px-4 py-3 text-sm">
                {!live ? (
                  <span className="text-slate-500">Select a method to see the projected outcome…</span>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-slate-400">
                      Lead left: <span className="font-mono text-slate-200">{remainingLeadYears.toFixed(1)} yr</span>
                      <span className="mx-2 text-slate-600">·</span>
                      {live.shattered ? (
                        <>Fragments need <span className="font-mono text-slate-200">{DISPERSE_YEARS} yr</span> to disperse</>
                      ) : (
                        <>Shift: <span className="font-mono text-slate-200">{formatDistanceM(live.shiftM)}</span></>
                      )}
                    </div>
                    <span className={`font-semibold uppercase ${live.success ? "text-emerald-400" : "text-accent-red"}`}>
                      {live.shattered
                        ? live.success ? "☢ will disperse" : "☢ will shatter — too late!"
                        : live.success ? "✓ will miss" : "✗ will hit"}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={deploy}
                disabled={!method}
                className={`w-full rounded-lg border py-3 text-sm font-bold uppercase tracking-widest transition ${
                  method
                    ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25"
                    : "cursor-not-allowed border-mission-border text-slate-600"
                }`}
              >
                ⟢ Deploy {selectedInfo ? selectedInfo.name : "—"} <span className="text-slate-500">(Enter)</span>
              </button>
            </div>
          )}

          {phase === "result" && outcome && (
            <ResultScreen
              outcome={outcome}
              score={score}
              best={best}
              onNext={() => startRound(threat.round + 1)}
              onRestart={startGame}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "amber" }) {
  return (
    <div className="rounded-lg border border-mission-border bg-mission-panel-2/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm tabular-nums ${accent === "amber" ? "text-accent-amber" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}

function GameSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
        <span className="font-mono text-sm text-accent-cyan">
          {formatNumber(value)} <span className="text-[11px] text-slate-500">{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function ResultScreen({
  outcome,
  score,
  best,
  onNext,
  onRestart,
}: {
  outcome: Outcome;
  score: number;
  best: number;
  onNext: () => void;
  onRestart: () => void;
}) {
  if (outcome.success) {
    const dispersed = outcome.reason === "dispersed";
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">{dispersed ? "☢️✨" : "🛡️✨"}</p>
        <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-400">
          {dispersed ? "Asteroid disrupted" : "Impact averted"}
        </h3>
        <p className="text-sm text-slate-400">
          {dispersed ? (
            <>
              Shattered with{" "}
              <span className="font-mono text-slate-200">{outcome.leadYears.toFixed(1)} yr</span>{" "}
              to spare — the fragments disperse and burn up harmlessly.
            </>
          ) : (
            <>
              Nudged by{" "}
              <span className="font-mono text-slate-200">
                {outcome.deltaVMs < 1
                  ? `${formatNumber(outcome.deltaVMs * 1000)} mm/s`
                  : `${formatNumber(outcome.deltaVMs)} m/s`}
              </span>{" "}
              — clears Earth by{" "}
              <span className="font-mono text-slate-200">{formatDistanceM(outcome.shiftM)}</span>.
            </>
          )}
        </p>
        <button
          onClick={onNext}
          className="rounded-lg border border-accent-cyan bg-accent-cyan/10 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
        >
          Next threat →
        </button>
      </div>
    );
  }

  const comparison = tntComparison(outcome.energyMt);
  const lostMsg =
    outcome.reason === "timeout"
      ? "You ran out of time — no defense deployed."
      : outcome.reason === "fragmented"
        ? `You shattered it too late — a swarm of fragments rains down instead of one rock.`
        : `Your nudge fell short — the impact point only moved ${formatDistanceM(outcome.shiftM)}.`;

  return (
    <div className="space-y-4 text-center">
      <p className="text-5xl">{outcome.reason === "fragmented" ? "💥💥" : "💥🌍"}</p>
      <h3 className="text-lg font-bold uppercase tracking-wider text-accent-red">Earth struck</h3>
      <p className="text-sm text-slate-400">
        {lostMsg} Impact energy {formatMegatons(outcome.energyMt)} — {comparison.sentence}
      </p>
      <div className="text-sm text-slate-300">
        Final score: <span className="font-mono text-accent-cyan">{score}</span>
        <span className="mx-2 text-slate-600">·</span>
        Best: <span className="font-mono text-accent-amber">{best}</span>
      </div>
      <button
        onClick={onRestart}
        className="rounded-lg border border-accent-cyan bg-accent-cyan/10 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
      >
        ↻ Play again
      </button>
    </div>
  );
}

export default DefendEarth;
