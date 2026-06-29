/**
 * OrbitView — 3D Sun / Earth / asteroid-orbit view (phase 2).
 * Sun at the origin, Earth animated on a 1 AU reference ring, and the asteroid's
 * orbit (from the store) drawn + animated. OrbitControls let the user
 * rotate/zoom. Standard materials only — reliable across setups.
 */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useSimStore } from "../store/useSimStore";
import Sun from "./Sun";
import Earth from "./Earth";
import AsteroidOrbit from "./AsteroidOrbit";

/** Scene units per AU. */
const SCENE_AU = 5;

function EarthSystem() {
  const earth = useRef<THREE.Group>(null);
  const t = useRef(0);

  const ringPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * SCENE_AU, 0, Math.sin(a) * SCENE_AU));
    }
    return pts;
  }, []);

  useFrame((_, delta) => {
    t.current += delta * 0.35;
    earth.current?.position.set(
      Math.cos(t.current) * SCENE_AU,
      0,
      Math.sin(t.current) * SCENE_AU,
    );
  });

  return (
    <>
      <Line points={ringPoints} color="#2b6fce" lineWidth={1} transparent opacity={0.45} />
      <group ref={earth} position={[SCENE_AU, 0, 0]}>
        <Earth />
      </group>
    </>
  );
}

function Scene() {
  const orbit = useSimStore((s) => s.orbit);
  return (
    <>
      <ambientLight intensity={0.35} />
      <Stars radius={120} depth={50} count={3500} factor={4} fade speed={0.4} />
      <Stars radius={60} depth={25} count={1200} factor={2.5} fade speed={0.8} />
      <Sun />
      <EarthSystem />
      <AsteroidOrbit orbit={orbit} sceneAU={SCENE_AU} />
    </>
  );
}

export function OrbitView() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-mission-border bg-mission-panel/80">
      <div className="pointer-events-none absolute left-4 top-3 z-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
          Orbit
        </h2>
        <p className="text-[11px] text-slate-500">Sun · Earth · asteroid (≈ Apophis)</p>
      </div>
      <div className="pointer-events-none absolute right-4 top-3 z-10 flex gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-amber" /> Sun
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> Earth
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-red" /> Asteroid
        </span>
      </div>
      <div className="h-[360px] w-full">
        <Canvas camera={{ position: [0, 7, 11], fov: 45 }}>
          <color attach="background" args={["#04050c"]} />
          <Scene />
          <OrbitControls
            enablePan={false}
            minDistance={4}
            maxDistance={30}
            autoRotate
            autoRotateSpeed={0.35}
          />
        </Canvas>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-4 z-10 text-[10px] text-slate-600">
        Drag to rotate · scroll to zoom · not to scale
      </p>
    </section>
  );
}

export default OrbitView;
