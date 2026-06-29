/**
 * AsteroidOrbit — the swept orbital ellipse + an irregular rock that travels
 * along it.
 *
 * The ellipse is drawn once (memoized) by sweeping the true anomaly; the marker
 * advances the mean anomaly each frame via the Kepler solver. Ecliptic (x,y,z)
 * maps to three.js (x, z, y) so the orbital plane lies flat. The rock is a
 * memoized, vertex-jittered icosahedron. Standard materials only (reliable).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  positionFromMeanAnomaly,
  sampleOrbitPath,
  toAU,
  type OrbitalElements,
} from "../physics";

interface AsteroidOrbitProps {
  orbit: OrbitalElements;
  /** Scene units per astronomical unit. */
  sceneAU: number;
  /** Animation speed (mean-anomaly radians/sec, scaled). */
  speed?: number;
}

function eclipticToScene(p: [number, number, number], sceneAU: number) {
  const au = toAU(p);
  return new THREE.Vector3(au[0] * sceneAU, au[2] * sceneAU, au[1] * sceneAU);
}

/** Lumpy little rock: an icosahedron with deterministic per-vertex jitter. */
function makeRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + (rand() - 0.5) * 0.45);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function AsteroidOrbit({
  orbit,
  sceneAU,
  speed = 0.25,
}: AsteroidOrbitProps) {
  const marker = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  const points = useMemo(
    () => sampleOrbitPath(orbit).map((p) => eclipticToScene(p, sceneAU)),
    [orbit, sceneAU],
  );
  const rockGeo = useMemo(makeRockGeometry, []);

  useFrame((_, delta) => {
    elapsed.current += delta * speed;
    const animated: OrbitalElements = {
      ...orbit,
      meanAnomalyRad: orbit.meanAnomalyRad + elapsed.current,
    };
    const pos = eclipticToScene(positionFromMeanAnomaly(animated), sceneAU);
    if (marker.current) {
      marker.current.position.copy(pos);
      marker.current.rotation.x += delta * 0.8;
      marker.current.rotation.y += delta * 1.1;
    }
  });

  return (
    <>
      <Line points={points} color="#22d3ee" lineWidth={1.5} transparent opacity={0.7} />
      <group ref={marker}>
        <mesh geometry={rockGeo}>
          <meshStandardMaterial
            color="#9a6b4f"
            emissive="#f87171"
            emissiveIntensity={0.5}
            roughness={0.9}
            metalness={0.1}
            flatShading
          />
        </mesh>
      </group>
    </>
  );
}

export default AsteroidOrbit;
