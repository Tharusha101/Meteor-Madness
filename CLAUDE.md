# CLAUDE.md — Meteor Madness

> Interactive asteroid-impact visualization & simulation tool.
> Built for the NASA Space Apps "Meteor Madness" challenge: turn raw NASA NEO + USGS data
> into a tool that lets anyone model an asteroid impact, see the consequences, and test
> deflection strategies.

This file is the source of truth for the project. **Read it fully before writing code.**
Keep it updated as the architecture evolves.

---

## 1. Goal & MVP

**One-liner:** A web app where a user picks (or invents) an asteroid, drops it on a point on
Earth, and immediately sees the energy released, crater, seismic magnitude, and blast/tsunami
footprint — then can try to deflect it and watch the impact point move.

**MVP (must work):**
- Sliders for asteroid diameter, density, velocity, impact angle → live-updating impact results
  (energy in joules + megatons TNT, TNT comparison, crater diameter, seismic magnitude).
- A 3D view: Sun, Earth, and the asteroid's orbital path, animated.
- A 2D map: click to set impact location, draw crater + blast-radius rings.
- A mitigation panel: apply a kinetic-impactor Δv with a lead time and show how the impact
  point shifts (or misses Earth entirely).
- Educational tooltips on every technical term (eccentricity, megatons, etc.).

**Stretch (nice to have):** "Defend Earth" timed game mode, real NEO data loaded from NASA's
API, tsunami run-up using USGS elevation, gravity-tractor + laser-ablation deflection, social
share of a scenario.

**Non-goals:** n-body simulation, full atmospheric entry modeling, server-side rendering.
Keep it client-side and fast.

---

## 2. Tech stack

- **Vite + React + TypeScript** — app foundation.
- **Tailwind CSS** — styling. Dark "mission control" theme (near-black bg, cyan/amber accents).
- **Zustand** — global state (sim parameters + computed results + impact location).
- **three + @react-three/fiber + @react-three/drei** — 3D orbital view.
- **react-leaflet + leaflet** — 2D impact map.
- **recharts** — small comparison charts (energy vs. known events).
- **Vitest** — unit tests for the physics module (the physics MUST be tested).

No backend required for the MVP. NASA's NEO API and JPL's SBDB API both support CORS and a
free/no key path, so the browser can call them directly. If a proxy becomes necessary for the
API key in production, add a thin serverless function later — do not stand up a full backend.

---

## 3. Directory structure

```
meteor-madness/
├── CLAUDE.md
├── index.html
├── .env.example              # VITE_NASA_API_KEY=DEMO_KEY
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   └── useSimStore.ts     # Zustand: params, results, impactLatLng, deflection
│   ├── physics/              # PURE functions only. No React, no side effects. Fully tested.
│   │   ├── constants.ts
│   │   ├── energy.ts          # mass, kinetic energy, TNT equivalent, impact velocity
│   │   ├── crater.ts          # transient + final crater diameter/depth
│   │   ├── seismic.ts         # impact energy → Richter magnitude
│   │   ├── deflection.ts      # kinetic impactor Δv, downrange shift
│   │   ├── orbital.ts         # Kepler solver, orbital elements → 3D position
│   │   └── tsunami.ts         # (phase 4) simplified deep-water wave / run-up
│   ├── data/
│   │   ├── neoApi.ts          # NASA NEO API + JPL SBDB client
│   │   └── usgsApi.ts         # USGS EPQS elevation + earthquake catalog
│   ├── scene/                # react-three-fiber
│   │   ├── OrbitView.tsx
│   │   ├── Sun.tsx
│   │   ├── Earth.tsx
│   │   └── AsteroidOrbit.tsx
│   ├── map/
│   │   └── ImpactMap.tsx
│   ├── ui/
│   │   ├── ControlPanel.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── MitigationPanel.tsx
│   │   ├── Tooltip.tsx
│   │   └── DefendEarth.tsx    # stretch
│   └── lib/
│       └── format.ts          # number/unit formatting helpers
└── tests/
    └── physics.test.ts
```

---

## 4. Data sources & APIs

**Units matter.** A unit mistake silently produces a wrong-by-1000× answer. Always note units
in variable names or comments (e.g. `velocityKmS`, `diameterM`, `energyJ`).

### NASA NEO Web Service — `https://api.nasa.gov/neo/rest/v1/`
- Key: `DEMO_KEY` for dev (rate-limited); register a free key at https://api.nasa.gov.
  Store it in `.env` as `VITE_NASA_API_KEY` and read via `import.meta.env`.
- `GET /neo/browse?api_key=...` — paginated list of NEOs.
- `GET /neo/{id}?api_key=...` — one object: `estimated_diameter`, `close_approach_data`
  (`relative_velocity.kilometers_per_second`, `miss_distance.kilometers`), `orbital_data`
  (`semi_major_axis` [AU], `eccentricity`, `inclination` [deg], `ascending_node_longitude`,
  `perihelion_argument`, `mean_anomaly`, `orbital_period`).
- **Miss distance is in km. Velocity is km/s.**

### JPL Small-Body Database (SBDB) — `https://ssd-api.jpl.nasa.gov/sbdb.api`
- No key. Best source of real Keplerian elements for a named object.
- `?sstr=Apophis&phys-par=true` → orbital elements + physical params (diameter, albedo).

### USGS Elevation Point Query Service (EPQS) — `https://epqs.nationalmap.gov/v1/json`
- `?x={lon}&y={lat}&units=Meters` → elevation at a point.
- Use to decide ocean vs. land impact (elevation ≤ 0 ≈ ocean → tsunami branch) and to estimate
  coastal run-up.

### USGS Earthquake Catalog — `https://earthquake.usgs.gov/fdsnws/event/1/query`
- `?format=geojson&minmagnitude=7&limit=20` → real quakes to compare the impact's seismic
  magnitude against ("this impact ≈ the 2011 Tōhoku earthquake").

Always wrap API calls in try/catch with a graceful fallback (use a bundled sample asteroid if
the network fails). The tool must work offline with manual slider inputs.

---

## 5. Physics & math (implement exactly)

Reference: **Collins, Melosh & Marcus (2005), "Earth Impact Effects Program," Meteoritics &
Planetary Science 40.** When in doubt, match that paper.

### Constants (`constants.ts`)
```
DENSITY_STONY   = 3000     # kg/m^3 (rocky impactor; iron ≈ 7800, comet ≈ 1000)
DENSITY_TARGET  = 2500     # kg/m^3 (sedimentary crust; water = 1000)
G               = 9.81     # m/s^2
V_ESCAPE_EARTH  = 11186    # m/s  (Earth escape velocity)
J_PER_MEGATON   = 4.184e15 # joules per megaton TNT
AU_M            = 1.495978707e11   # meters
MU_SUN          = 1.32712440018e20 # m^3/s^2
```

### Impact velocity (`energy.ts`)
NEO close-approach velocity `v_inf` is relative velocity far from Earth. The velocity at the
surface is higher because Earth's gravity accelerates the object:
```
v_impact = sqrt(v_inf^2 + V_ESCAPE_EARTH^2)
```
(Atmospheric deceleration is ignored for the MVP — note that small stony bodies <~50–100 m may
airburst rather than reach the ground; Chelyabinsk ≈ 20 m, Tunguska ≈ 50–60 m. Flag this, don't
model it yet.)

### Energy (`energy.ts`)
```
r  = diameterM / 2
mass_kg = (Math.PI / 6) * densityImpactor * diameterM**3   # sphere = (4/3)πr³
energy_J = 0.5 * mass_kg * v_impact**2
energy_megatons = energy_J / J_PER_MEGATON
```

### Crater (`crater.ts`)  — π-group scaling, θ = impact angle from horizontal (45° typical)
```
# transient crater diameter, meters
Dtc = 1.161
    * (densityImpactor / densityTarget)**(1/3)
    * diameterM**0.78
    * v_impact**0.44
    * G**(-0.22)
    * Math.sin(theta_rad)**(1/3)

# final crater (Earth): simple if final < ~3.2 km, else complex
Dfinal_simple  = 1.25 * Dtc
Dfinal_complex = 1.17 * Dtc**1.13 / 3200**0.13   # Dc = 3200 m transition
# pick simple if Dtc < 2560 m else complex
craterDepth_m  = Dtc / 2.828   # ≈ Dtc / (2√2), transient depth
```

### Seismic magnitude (`seismic.ts`)
```
richter = 0.67 * Math.log10(energy_J) - 5.87
```

### Orbital mechanics (`orbital.ts`)
Given elements a [m], e, i, Ω (ascending node), ω (arg. of periapsis), and mean anomaly M:
1. Solve Kepler's equation `M = E - e*sin(E)` for eccentric anomaly E by Newton–Raphson:
   start `E = M`; iterate `E -= (E - e*sin(E) - M) / (1 - e*cos(E))` until |ΔE| < 1e-8.
2. True anomaly: `ν = 2*atan2(sqrt(1+e)*sin(E/2), sqrt(1-e)*cos(E/2))`
3. Radius: `r = a*(1 - e*cos(E))`
4. Position in orbital plane: `xp = r*cos(ν)`, `yp = r*sin(ν)`, then rotate by ω, i, Ω into
   heliocentric coordinates (standard 3-rotation).

For the **visual** orbit you don't need time-accurate propagation — sweep ν from 0→2π to draw
the ellipse, and animate a marker along it. Scale distances by AU for the scene. (Time-accurate
propagation with `n = sqrt(MU_SUN/a³)` is a later refinement.)

### Deflection (`deflection.ts`)
**Kinetic impactor:** momentum transfer with enhancement factor β (DART measured β ≈ 3.6;
default 2–4):
```
deltaV = beta * (impactorMass_kg * impactorVelocity_ms) / asteroidMass_kg   # m/s
# first-order downrange shift at Earth after lead time T (seconds):
shift_m = deltaV * leadTime_s        # note: real along-track dynamics amplify this; keep simple
```
Teaching point to surface in the UI: **a tiny Δv applied years early beats a huge Δv applied
days before impact.** Make the lead-time slider dramatic.

**Gravity tractor / laser ablation:** model as a much smaller continuous Δv over a long T
(stretch goal).

### Tsunami (`tsunami.ts`, phase 4 — approximate, verify against EIEP)
If impact elevation ≤ 0 (ocean), branch to a simplified deep-water wave estimate scaled by
energy and water depth, and estimate coastal run-up using the target coast's USGS elevation.
Keep this clearly labeled as an estimate; do not over-claim precision.

---

## 6. Conventions

- `src/physics/` is **pure**: plain functions, typed inputs/outputs, no React, no fetch, no
  globals. This is what makes it unit-testable — keep it that way.
- All physics inputs/outputs carry SI units in the name or a comment. Convert at the UI boundary.
- State lives in **one** Zustand store (`useSimStore`). Components read what they need; the
  results object is derived from params by calling the physics functions.
- Components are small and single-purpose. Heavy three.js objects use `useMemo`.
- Tailwind for all styling; no separate CSS files beyond Leaflet/global resets.
- Format numbers for humans (`format.ts`): "12 megatons", "1.4 km", "magnitude 7.2".

---

## 7. Commands

```
npm install
npm run dev        # Vite dev server
npm run build      # production build
npm run test       # vitest (physics)
npm run test -- --watch
```

---

## 8. Roadmap (build in this order)

1. **Scaffold + physics core + results panel.** Sliders → live numbers. Physics fully tested.
2. **3D orbit view.** Sun + Earth + animated asteroid ellipse.
3. **Impact map.** Click to place impact; draw crater + blast rings; ocean/land detection.
4. **Mitigation panel.** Kinetic-impactor Δv + lead time → impact point shifts or misses.
5. **Real data + education.** Load NEOs from NASA/SBDB; tooltips everywhere; event comparisons.
6. **Stretch:** "Defend Earth" timed mode, tsunami run-up, advanced deflection, share links.

---

## 9. Pitfalls to avoid

- **Unit bugs.** km vs m, km/s vs m/s, AU vs m. Most "wrong by 1000×" results are this.
- **Forgetting escape-velocity boost** to impact velocity.
- **Over-engineering the physics.** Ship the EIEP formulas above; don't chase n-body accuracy.
- **No offline fallback.** The tool must run from sliders alone if APIs fail.
- **Cluttered UI / jargon.** Every technical term needs a tooltip. Test with a non-expert.
- **Performance.** Memoize three.js geometry; don't recompute the whole scene every slider tick.

## 10. Definition of done (MVP)

`npm run dev` shows: working sliders with live impact results, an animated 3D orbit, a clickable
impact map with crater/blast rings, and a deflection control that visibly moves the impact point
— with passing physics tests and tooltips on the key terms.
