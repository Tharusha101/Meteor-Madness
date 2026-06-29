/**
 * DefendArcade — a real-time arcade defense game on a 2D canvas (no WebGL, so
 * it's reliable). You pilot a ship: fly (WASD/arrows), aim (mouse), fire a laser
 * (click / Space), and RAM asteroids to smash them — ramming is powerful but
 * costs hull integrity, while the laser is safe but gradual. Stop the asteroids
 * before they hit Earth at the bottom of the arena.
 *
 * The whole game loop runs on requestAnimationFrame with state in a ref (React
 * is only used for the menu / game-over overlays), so there are no per-frame
 * re-renders.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 760;
const H = 480;
const EARTH = { x: W / 2, y: H + 70, r: 150 }; // dome peeking up at the bottom
const BEST_KEY = "meteor-madness:arcade-best";

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hull: number;
  cooldown: number;
}
interface Roid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  rot: number;
  verts: number[];
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Game {
  ship: Ship;
  roids: Roid[];
  parts: Particle[];
  stars: { x: number; y: number; z: number }[];
  earthHp: number;
  laser: number; // 0..1 energy
  firing: boolean;
  score: number;
  elapsed: number;
  spawnIn: number;
  keys: Set<string>;
  mouse: { x: number; y: number; down: boolean };
  over: boolean;
  shake: number;
  /** Current laser hit point (set each frame), drawn by the renderer. */
  _beam?: { roid: Roid; x: number; y: number; dist: number } | null;
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function makeRoid(elapsed: number): Roid {
  const r = rand(16, 28 + Math.min(24, elapsed * 0.35));
  const speed = rand(30, 52 + Math.min(78, elapsed * 1.2));
  const x = rand(40, W - 40);
  // aim roughly at Earth with some spread
  const tx = EARTH.x + rand(-160, 160);
  const ty = EARTH.y - EARTH.r;
  const ang = Math.atan2(ty - 0, tx - x);
  const verts: number[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) verts.push(rand(0.75, 1.15));
  return {
    x,
    y: -r,
    vx: Math.cos(ang) * speed,
    vy: Math.abs(Math.sin(ang) * speed) + speed * 0.5,
    r,
    spin: rand(-1, 1),
    rot: 0,
    verts,
  };
}

function newGame(): Game {
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: rand(0.3, 1),
  }));
  return {
    ship: { x: W / 2, y: H - 140, vx: 0, vy: 0, angle: -Math.PI / 2, hull: 100, cooldown: 0 },
    roids: [],
    parts: [],
    stars,
    earthHp: 100,
    laser: 1,
    firing: false,
    score: 0,
    elapsed: 0,
    spawnIn: 2.4,
    keys: new Set(),
    mouse: { x: W / 2, y: 0, down: false },
    over: false,
    shake: 0,
  };
}

function burst(g: Game, x: number, y: number, color: string, n: number, spd: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(spd * 0.3, spd);
    g.parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.3, 0.8),
      max: 0.8,
      color,
      size: rand(1.5, 3.5),
    });
  }
}

interface DefendArcadeProps {
  open: boolean;
  onClose: () => void;
}

export function DefendArcade({ open, onClose }: DefendArcadeProps) {
  const [phase, setPhase] = useState<"intro" | "playing" | "over">("intro");
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [verdict, setVerdict] = useState<"earth" | "ship">("earth");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) ?? "0");
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  useEffect(() => {
    if (!open) setPhase("intro");
  }, [open]);

  const start = useCallback(() => {
    gameRef.current = newGame();
    setPhase("playing");
  }, []);

  // Main game loop.
  useEffect(() => {
    if (!open || phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current!;

    const GAME_KEYS = new Set([
      "w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ",
    ]);
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        onClose();
        return;
      }
      if (GAME_KEYS.has(k)) {
        e.preventDefault();
        g.keys.add(k);
        if (k === " ") g.firing = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      g.keys.delete(k);
      if (k === " ") g.firing = false;
    };
    const toCanvas = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      g.mouse.x = ((e.clientX - rect.left) / rect.width) * W;
      g.mouse.y = ((e.clientY - rect.top) / rect.height) * H;
    };
    const onMove = (e: MouseEvent) => toCanvas(e);
    const onDown = (e: MouseEvent) => {
      toCanvas(e);
      g.mouse.down = true;
      g.firing = true;
    };
    const onUp = () => {
      g.mouse.down = false;
      if (!g.keys.has(" ")) g.firing = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    let raf = 0;
    let last = performance.now();

    const endGame = (why: "earth" | "ship") => {
      g.over = true;
      setVerdict(why);
      setFinalScore(Math.floor(g.score));
      setBest((b) => {
        const nb = Math.max(b, Math.floor(g.score));
        localStorage.setItem(BEST_KEY, String(nb));
        return nb;
      });
      setPhase("over");
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(g, dt, endGame);
      render(ctx, g);
      if (!g.over) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [open, phase, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-mission-border bg-mission-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-mission-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕹️</span>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-100">
              Defend Earth — Arcade
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider text-slate-400">
            <span>Best <span className="font-mono text-accent-amber">{best}</span></span>
            <button
              onClick={onClose}
              className="rounded border border-mission-border px-2 py-1 transition hover:border-accent-red hover:text-accent-red"
            >
              ✕ Esc
            </button>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full"
            style={{ aspectRatio: `${W} / ${H}`, background: "#03040a", cursor: "crosshair" }}
          />

          {phase === "intro" && (
            <Overlay>
              <p className="text-5xl">🚀🌍</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">Pilot the defender</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                Asteroids are falling toward Earth. <strong className="text-accent-cyan">Lase</strong>{" "}
                them to push them back and break them up — or{" "}
                <strong className="text-accent-amber">ram</strong> them for a big hit (it dents your hull).
                Don&rsquo;t let them through.
              </p>
              <div className="mx-auto mt-3 max-w-md text-[12px] text-slate-400">
                <span className="rounded bg-mission-panel-2 px-2 py-1 font-mono">WASD / ◄▲▼►</span> move ·{" "}
                <span className="rounded bg-mission-panel-2 px-2 py-1 font-mono">Mouse</span> aim ·{" "}
                <span className="rounded bg-mission-panel-2 px-2 py-1 font-mono">Click / Space</span> fire laser
              </div>
              <button
                onClick={start}
                className="mt-4 rounded-lg border border-accent-cyan bg-accent-cyan/10 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
              >
                ▶ Launch
              </button>
            </Overlay>
          )}

          {phase === "over" && (
            <Overlay>
              <p className="text-5xl">{verdict === "earth" ? "💥🌍" : "🛰️💀"}</p>
              <h3 className="mt-2 text-lg font-bold uppercase tracking-wider text-accent-red">
                {verdict === "earth" ? "Earth overwhelmed" : "Defender destroyed"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {verdict === "earth"
                  ? "Too many asteroids got through."
                  : "Your hull took one hit too many — ram less, lase more."}
              </p>
              <div className="mt-3 text-sm text-slate-300">
                Score <span className="font-mono text-accent-cyan">{finalScore}</span>
                <span className="mx-2 text-slate-600">·</span>
                Best <span className="font-mono text-accent-amber">{best}</span>
              </div>
              <button
                onClick={start}
                className="mt-4 rounded-lg border border-accent-cyan bg-accent-cyan/10 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan/20"
              >
                ↻ Play again
              </button>
            </Overlay>
          )}
        </div>
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-6 text-center backdrop-blur-[2px]">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------
function update(g: Game, dt: number, endGame: (w: "earth" | "ship") => void) {
  g.elapsed += dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 60);

  const s = g.ship;

  // Thrust from keys.
  const acc = 900;
  let ax = 0;
  let ay = 0;
  if (g.keys.has("a") || g.keys.has("arrowleft")) ax -= 1;
  if (g.keys.has("d") || g.keys.has("arrowright")) ax += 1;
  if (g.keys.has("w") || g.keys.has("arrowup")) ay -= 1;
  if (g.keys.has("s") || g.keys.has("arrowdown")) ay += 1;
  const m = Math.hypot(ax, ay) || 1;
  s.vx += (ax / m) * acc * dt;
  s.vy += (ay / m) * acc * dt;
  // damping + clamp
  const damp = Math.pow(0.0008, dt);
  s.vx *= damp;
  s.vy *= damp;
  const sp = Math.hypot(s.vx, s.vy);
  const maxSp = 360;
  if (sp > maxSp) {
    s.vx = (s.vx / sp) * maxSp;
    s.vy = (s.vy / sp) * maxSp;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  // keep above Earth's surface and inside arena
  s.x = Math.max(16, Math.min(W - 16, s.x));
  s.y = Math.max(16, Math.min(H - 40, s.y));
  s.angle = Math.atan2(g.mouse.y - s.y, g.mouse.x - s.x);
  if (s.cooldown > 0) s.cooldown -= dt;

  // Laser energy.
  const wantFire = g.firing && g.laser > 0.02;
  if (wantFire) g.laser = Math.max(0, g.laser - dt * 0.4);
  else g.laser = Math.min(1, g.laser + dt * 0.4);

  // Laser hit: nearest asteroid along the aim ray from the ship nose.
  let beamHit: { roid: Roid; x: number; y: number; dist: number } | null = null;
  if (wantFire) {
    const dx = Math.cos(s.angle);
    const dy = Math.sin(s.angle);
    for (const r of g.roids) {
      // project asteroid center onto the ray
      const t = (r.x - s.x) * dx + (r.y - s.y) * dy;
      if (t <= 0) continue;
      const px = s.x + dx * t;
      const py = s.y + dy * t;
      const perp = Math.hypot(r.x - px, r.y - py);
      if (perp < r.r && (!beamHit || t < beamHit.dist)) {
        beamHit = { roid: r, x: px, y: py, dist: t };
      }
    }
    if (beamHit) {
      const r = beamHit.roid;
      // ablate (shrink) + push along the beam
      r.r -= 26 * dt;
      const push = 230 * dt;
      r.vx += Math.cos(s.angle) * push;
      r.vy += Math.sin(s.angle) * push;
      if (Math.random() < 0.6) burst(g, beamHit.x, beamHit.y, "#fbbf24", 1, 120);
      if (r.r < 9) {
        burst(g, r.x, r.y, "#22d3ee", 16, 200);
        g.score += 12;
        r.r = -1; // mark dead
      }
    }
  }
  g._beam = wantFire ? beamHit : null;

  // Asteroids.
  for (const r of g.roids) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.spin * dt;
    // wall bounce on sides
    if (r.x < r.r && r.vx < 0) r.vx *= -0.7;
    if (r.x > W - r.r && r.vx > 0) r.vx *= -0.7;

    // Earth impact?
    const de = Math.hypot(r.x - EARTH.x, r.y - EARTH.y);
    if (de < EARTH.r + r.r) {
      g.earthHp -= 4 + r.r * 0.35;
      burst(g, r.x, r.y, "#f87171", 22, 240);
      g.shake = 14;
      r.r = -1;
      continue;
    }
    // escaped off the top → deflected away, small reward
    if (r.y < -r.r - 10) {
      g.score += 4;
      r.r = -1;
      continue;
    }

    // Ram collision with ship.
    const ds = Math.hypot(r.x - s.x, r.y - s.y);
    if (ds < r.r + 11) {
      const nx = (r.x - s.x) / (ds || 1);
      const ny = (r.y - s.y) / (ds || 1);
      const impact = Math.hypot(s.vx, s.vy) + 140;
      r.vx += nx * impact * 1.2 + s.vx * 0.5;
      r.vy += ny * impact * 1.2 + s.vy * 0.5;
      r.r -= 7; // chip it
      s.vx -= nx * 120;
      s.vy -= ny * 120;
      s.hull -= 14 + r.r * 0.3;
      burst(g, (r.x + s.x) / 2, (r.y + s.y) / 2, "#fb923c", 12, 200);
      g.shake = 10;
      g.score += 5;
      if (r.r < 9) {
        burst(g, r.x, r.y, "#fb923c", 14, 200);
        g.score += 8;
        r.r = -1;
      }
    }
  }
  g.roids = g.roids.filter((r) => r.r > 0);

  // Particles.
  for (const p of g.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  g.parts = g.parts.filter((p) => p.life > 0);

  // Spawning ramps up over time.
  g.spawnIn -= dt;
  if (g.spawnIn <= 0) {
    g.roids.push(makeRoid(g.elapsed));
    g.spawnIn = Math.max(0.7, 2.2 - g.elapsed * 0.018);
  }

  // Survival score.
  g.score += dt * 2;

  if (g.earthHp <= 0) return endGame("earth");
  if (g.ship.hull <= 0) return endGame("ship");
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function render(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.save();
  if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake) * 0.4, rand(-g.shake, g.shake) * 0.4);

  ctx.fillStyle = "#03040a";
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // stars
  for (const st of g.stars) {
    ctx.globalAlpha = 0.4 + st.z * 0.5;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(st.x, st.y, st.z * 1.6, st.z * 1.6);
  }
  ctx.globalAlpha = 1;

  // Earth dome
  const grd = ctx.createRadialGradient(EARTH.x, EARTH.y, EARTH.r * 0.4, EARTH.x, EARTH.y, EARTH.r);
  grd.addColorStop(0, "#3b82f6");
  grd.addColorStop(0.7, "#1d4ed8");
  grd.addColorStop(1, "#0b2a6b");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(EARTH.x, EARTH.y, EARTH.r, 0, Math.PI * 2);
  ctx.fill();
  // atmosphere rim
  ctx.strokeStyle = "rgba(90,200,255,0.6)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(EARTH.x, EARTH.y, EARTH.r + 2, Math.PI, Math.PI * 2);
  ctx.stroke();

  // particles
  for (const p of g.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // asteroids
  for (const r of g.roids) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.beginPath();
    const n = r.verts.length;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r.r * r.verts[i];
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#6b5240";
    ctx.fill();
    ctx.strokeStyle = "#a8896b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // laser beam
  const s = g.ship;
  if (g._beam !== undefined && g._beam) {
    const b = g._beam;
    ctx.strokeStyle = "rgba(34,211,238,0.9)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (g.firing && g.laser > 0.02) {
    // beam to arena edge if no hit
    ctx.strokeStyle = "rgba(34,211,238,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
    ctx.lineTo(s.x + Math.cos(s.angle) * 900, s.y + Math.sin(s.angle) * 900);
    ctx.stroke();
  }

  // ship
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  // thruster flame
  if (g.keys.size > 0) {
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-18 - Math.random() * 6, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-11, -9);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-11, 9);
  ctx.closePath();
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // ---- HUD ----
  drawBar(ctx, 14, 14, 180, "EARTH", g.earthHp / 100, "#3b82f6");
  drawBar(ctx, 14, 40, 180, "HULL", Math.max(0, g.ship.hull) / 100, "#f87171");
  drawBar(ctx, 14, 66, 180, "LASER", g.laser, "#22d3ee");

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(String(Math.floor(g.score)), W - 16, 30);
  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SCORE", W - 16, 44);
  ctx.textAlign = "left";
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  frac: number,
  color: string,
) {
  ctx.fillStyle = "#1b2735";
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 12);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 12);
  ctx.fillStyle = "#0b1018";
  ctx.font = "bold 9px ui-monospace, monospace";
  ctx.fillText(label, x + 5, y + 9);
}

export default DefendArcade;
