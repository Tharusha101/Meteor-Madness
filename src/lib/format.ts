/**
 * Human-friendly number/unit formatting for the UI.
 * Physics stays in SI; everything is converted for display here.
 */

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
}

/** "4.77 × 10¹⁶" style scientific notation. */
export function formatScientific(value: number, digits = 2): string {
  if (!isFinite(value) || value === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exp;
  return `${mantissa.toFixed(digits)} × 10${toSuperscript(exp)}`;
}

/** Energy in joules, scientific notation. */
export function formatJoules(energyJ: number): string {
  return `${formatScientific(energyJ)} J`;
}

/** Megatons of TNT, scaled to a readable unit. */
export function formatMegatons(megatons: number): string {
  if (megatons >= 1e9) return `${formatScientific(megatons)} Mt`;
  if (megatons >= 1) return `${formatNumber(megatons)} megatons`;
  if (megatons >= 1e-3) return `${formatNumber(megatons * 1000)} kilotons`;
  return `${formatNumber(megatons * 1e6)} tons`;
}

/** Distance given in meters, shown in m / km as appropriate. */
export function formatDistanceM(meters: number): string {
  if (meters >= 1000) return `${formatNumber(meters / 1000)} km`;
  return `${formatNumber(meters)} m`;
}

/** Velocity given in m/s, shown in km/s. */
export function formatVelocityMs(ms: number): string {
  return `${formatNumber(ms / 1000)} km/s`;
}

/** "magnitude 7.2" style seismic magnitude. */
export function formatMagnitude(richter: number): string {
  return richter.toFixed(1);
}

/** General number formatter: thousands separators, sensible precision. */
export function formatNumber(value: number): string {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  let digits = 0;
  if (abs > 0 && abs < 10) digits = 2;
  else if (abs < 100) digits = 1;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

// --- Reference events for "TNT-equivalent" comparisons -----------------------

export interface ReferenceEvent {
  name: string;
  megatons: number;
  blurb: string;
}

/** Ordered low -> high. Megaton figures are widely-cited approximations. */
export const REFERENCE_EVENTS: ReferenceEvent[] = [
  { name: "Hiroshima bomb", megatons: 0.015, blurb: "“Little Boy”, 1945" },
  { name: "Chelyabinsk meteor", megatons: 0.5, blurb: "airburst, 2013" },
  { name: "Tunguska event", megatons: 12, blurb: "Siberia airburst, 1908" },
  { name: "Castle Bravo test", megatons: 15, blurb: "largest US nuclear test" },
  { name: "Mt. St. Helens", megatons: 24, blurb: "1980 eruption" },
  { name: "Tsar Bomba", megatons: 50, blurb: "largest bomb ever detonated" },
  { name: "Krakatoa eruption", megatons: 200, blurb: "1883" },
  { name: "Chicxulub impact", megatons: 1e8, blurb: "dinosaur extinction" },
];

export interface TntComparison {
  /** How many Hiroshima bombs this impact equals. */
  hiroshimas: number;
  /** The closest reference event (by log-distance). */
  nearest: ReferenceEvent;
  /** A ready-to-render sentence. */
  sentence: string;
}

/** Compare an energy (in megatons) to known events. */
export function tntComparison(megatons: number): TntComparison {
  const hiroshimas = megatons / 0.015;

  // Closest event in log-space (energies span many orders of magnitude).
  let nearest = REFERENCE_EVENTS[0];
  let best = Infinity;
  for (const ev of REFERENCE_EVENTS) {
    const d = Math.abs(Math.log10(megatons) - Math.log10(ev.megatons));
    if (d < best) {
      best = d;
      nearest = ev;
    }
  }

  const ratio = megatons / nearest.megatons;
  let rel: string;
  if (ratio >= 1.15) rel = `${formatNumber(ratio)}× the`;
  else if (ratio <= 0.87) rel = `${formatNumber(1 / ratio)}× weaker than the`;
  else rel = "comparable to the";

  const sentence = `≈ ${rel} ${nearest.name} (${nearest.blurb}).`;

  return { hiroshimas, nearest, sentence };
}

// --- Reference earthquakes for seismic-magnitude comparisons ------------------

export interface ReferenceQuake {
  name: string;
  magnitude: number;
  /** Optional year for named historical quakes. */
  year?: number;
}

/** Spread of magnitudes (named events + generic descriptors) for matching. */
export const REFERENCE_QUAKES: ReferenceQuake[] = [
  { name: "barely detectable tremor", magnitude: 2.5 },
  { name: "minor quake, rarely felt", magnitude: 3.5 },
  { name: "light quake, felt indoors", magnitude: 4.5 },
  { name: "moderate quake, minor damage", magnitude: 5.5 },
  { name: "L'Aquila, Italy", magnitude: 6.3, year: 2009 },
  { name: "Haiti", magnitude: 7.0, year: 2010 },
  { name: "Nepal (Gorkha)", magnitude: 7.8, year: 2015 },
  { name: "Chile (Maule)", magnitude: 8.8, year: 2010 },
  { name: "Tōhoku, Japan", magnitude: 9.1, year: 2011 },
  { name: "Great Chile — largest ever recorded", magnitude: 9.5, year: 1960 },
];

/** Find the closest reference earthquake to a magnitude and build a sentence. */
export function nearestQuake(richter: number): {
  quake: ReferenceQuake;
  sentence: string;
} {
  let quake = REFERENCE_QUAKES[0];
  let best = Infinity;
  for (const q of REFERENCE_QUAKES) {
    const d = Math.abs(richter - q.magnitude);
    if (d < best) {
      best = d;
      quake = q;
    }
  }
  const label = quake.year ? `${quake.name} (${quake.year})` : quake.name;
  return { quake, sentence: `≈ M${quake.magnitude.toFixed(1)} — ${label}` };
}
