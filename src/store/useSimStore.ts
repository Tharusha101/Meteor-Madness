/**
 * Single global store for the simulator.
 *
 * Holds raw sim params + derived results (phase 1), the asteroid's orbit
 * (phase 2), the impact location + elevation (phase 3), and the deflection
 * inputs (phase 4). `results` is kept in sync by re-running the pure
 * `computeImpact` pipeline whenever a param changes.
 */
import { useMemo } from "react";
import { create } from "zustand";
import {
  AU_M,
  computeImpact,
  DENSITY_STONY,
  EARTH_RADIUS_M,
  kineticImpactorDeflection,
  type ImpactParams,
  type ImpactResults,
  type OrbitalElements,
} from "../physics";
import { getElevation, type ElevationResult } from "../data/usgsApi";

export type SimParams = ImpactParams;
export type ParamKey = keyof SimParams;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeflectionInputs {
  enabled: boolean;
  /** Impactor spacecraft mass (kg). DART was ~570 kg. */
  impactorMassKg: number;
  /** Impactor closing velocity (km/s). DART was ~6.6 km/s. */
  impactorVelocityKmS: number;
  /** Lead time before impact (years). */
  leadTimeYears: number;
  /** Momentum enhancement factor β. DART measured ≈ 3.6. */
  beta: number;
}

export type ElevationStatus = "idle" | "loading" | "ready" | "error";

interface SimState {
  // --- phase 1: impactor params + results ---
  params: SimParams;
  results: ImpactResults;
  setParam: (key: ParamKey, value: number) => void;
  reset: () => void;

  // --- phase 2: orbit ---
  orbit: OrbitalElements;

  // --- phase 3: impact location ---
  impactLatLng: LatLng | null;
  setImpactLatLng: (ll: LatLng) => void;
  elevation: ElevationResult | null;
  elevationStatus: ElevationStatus;
  fetchElevation: (ll: LatLng) => Promise<void>;

  // --- phase 4: deflection ---
  deflection: DeflectionInputs;
  setDeflection: (patch: Partial<DeflectionInputs>) => void;
}

/** Defaults: a ~50 m stony asteroid at 19 km/s — Tunguska-scale. */
export const DEFAULT_PARAMS: SimParams = {
  diameterM: 50,
  densityKgM3: DENSITY_STONY,
  velocityKmS: 19,
  impactAngleDeg: 45,
};

const DEG = Math.PI / 180;

/** Default orbit ≈ 99942 Apophis (a famous near-Earth asteroid). */
export const DEFAULT_ORBIT: OrbitalElements = {
  semiMajorAxisM: 0.9224 * AU_M,
  eccentricity: 0.1914,
  inclinationRad: 3.339 * DEG,
  ascendingNodeRad: 203.96 * DEG,
  argPeriapsisRad: 126.6 * DEG,
  meanAnomalyRad: 245 * DEG,
};

export const DEFAULT_DEFLECTION: DeflectionInputs = {
  enabled: false,
  impactorMassKg: 600,
  impactorVelocityKmS: 6.6,
  leadTimeYears: 5,
  beta: 3.6,
};

export const useSimStore = create<SimState>((set) => ({
  params: DEFAULT_PARAMS,
  results: computeImpact(DEFAULT_PARAMS),
  setParam: (key, value) =>
    set((state) => {
      const params = { ...state.params, [key]: value };
      return { params, results: computeImpact(params) };
    }),
  reset: () =>
    set({
      params: DEFAULT_PARAMS,
      results: computeImpact(DEFAULT_PARAMS),
      impactLatLng: null,
      elevation: null,
      elevationStatus: "idle",
      deflection: DEFAULT_DEFLECTION,
    }),

  orbit: DEFAULT_ORBIT,

  impactLatLng: null,
  setImpactLatLng: (ll) => set({ impactLatLng: ll }),
  elevation: null,
  elevationStatus: "idle",
  fetchElevation: async (ll) => {
    set({ elevationStatus: "loading" });
    try {
      const elevation = await getElevation(ll.lat, ll.lng);
      set({ elevation, elevationStatus: "ready" });
    } catch {
      // Graceful offline fallback: assume land so the tool keeps working.
      set({ elevation: null, elevationStatus: "error" });
    }
  },

  deflection: DEFAULT_DEFLECTION,
  setDeflection: (patch) =>
    set((state) => ({ deflection: { ...state.deflection, ...patch } })),
}));

// --- Derived deflection outcome ----------------------------------------------

export interface DeflectionOutcome {
  enabled: boolean;
  /** Velocity change imparted to the asteroid (m/s). */
  deltaVMs: number;
  /** Downrange shift of the impact point after the lead time (m). */
  downrangeShiftM: number;
  /** True if the shift exceeds Earth's radius — the asteroid misses entirely. */
  isMiss: boolean;
}

/**
 * Hook: the deflection result for the *current* asteroid (its mass comes from
 * the live results) and deflection inputs. Recomputes only when those change.
 */
export function useDeflectionResult(): DeflectionOutcome {
  const d = useSimStore((s) => s.deflection);
  const massKg = useSimStore((s) => s.results.massKg);
  return useMemo(() => {
    const { deltaVMs, downrangeShiftM } = kineticImpactorDeflection({
      impactorMassKg: d.impactorMassKg,
      impactorVelocityMs: d.impactorVelocityKmS * 1000,
      asteroidMassKg: massKg,
      leadTimeS: d.leadTimeYears * 365.25 * 86400,
      beta: d.beta,
    });
    return {
      enabled: d.enabled,
      deltaVMs,
      downrangeShiftM,
      isMiss: downrangeShiftM >= EARTH_RADIUS_M,
    };
  }, [d, massKg]);
}
