/**
 * Plain-language definitions for every technical term in the UI.
 * Keep these jargon-free — they're written for a curious non-expert.
 */
export const GLOSSARY = {
  diameter: "How wide the asteroid is, across the middle. Bigger = vastly more mass and energy (mass grows with the cube of diameter).",
  density: "How much mass is packed into the asteroid. Icy comets are light (~1000 kg/m³), rock is medium (~3000), solid iron is heavy (~7800).",
  velocity: "The asteroid's speed relative to Earth while it's still far away (v∞). Near-Earth asteroids typically hit at 11–72 km/s.",
  impactAngle: "The angle the asteroid strikes the ground, measured from the horizon. 90° is straight down; 45° is the single most likely angle.",
  escapeVelocity: "Earth's gravity speeds the asteroid up as it falls in, so it always hits faster than its approach speed: v_impact = √(v∞² + 11.2 km/s²).",
  kineticEnergy: "The energy of motion released on impact: ½ × mass × velocity². This is what does the damage.",
  megaton: "A unit of energy equal to exploding one million tons of TNT (4.184×10¹⁵ joules). The Hiroshima bomb was about 0.015 megatons.",
  tntEquivalent: "The impact's energy expressed as an equivalent amount of TNT, so it can be compared to bombs and other explosions.",
  crater: "The bowl carved out of the ground. Above ~3 km, craters collapse into wider, shallower 'complex' craters with central peaks.",
  transientCrater: "The momentary cavity blasted out at the instant of impact, before the walls slump and the floor rebounds.",
  seismicMagnitude: "How big an earthquake the impact's shaking is equivalent to, on the Richter scale: M = 0.67 × log₁₀(energy) − 5.87.",
  airburst: "Small stony asteroids (< ~100 m) often explode in mid-air from atmospheric pressure instead of reaching the ground — like Tunguska (1908) and Chelyabinsk (2013).",
  fireball: "The blindingly hot ball of vaporized rock and air at the impact point. Everything inside is incinerated.",
  overpressure: "The spike in air pressure from the blast wave. ~5 psi collapses houses; ~20 psi flattens reinforced buildings.",
  eccentricity: "How stretched an orbit is. 0 is a perfect circle; closer to 1 is a long, thin ellipse.",
  semiMajorAxis: "Half the long axis of the orbital ellipse — essentially the orbit's average distance from the Sun.",
  inclination: "How tilted the orbit is compared to Earth's orbital plane.",
  deltaV: "The change in the asteroid's speed (Δv) produced by a deflection. Even a tiny Δv, given enough time, moves the impact point a long way.",
  beta: "Momentum enhancement factor. Debris blasted off the asteroid acts like extra thrust, so the push is stronger than the spacecraft alone. NASA's DART measured β ≈ 3.6.",
  leadTime: "How far in advance of impact the deflection happens. The earlier the nudge, the more the asteroid drifts off course — this matters far more than raw force.",
  kineticImpactor: "Deflecting an asteroid by crashing a spacecraft into it to change its speed. NASA's DART mission proved this works in 2022.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
