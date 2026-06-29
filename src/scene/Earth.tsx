/**
 * Earth — blue marble with a soft atmosphere halo and gentle self-rotation.
 * Positioned/animated by its parent group in OrbitView. Uses only standard
 * materials (no custom shaders) so it renders reliably and offline.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Earth() {
  const surface = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (surface.current) surface.current.rotation.y += delta * 0.15;
  });

  return (
    // ~23.5° axial tilt
    <group rotation={[0, 0, 0.41]}>
      <mesh ref={surface}>
        <sphereGeometry args={[0.18, 48, 48]} />
        <meshStandardMaterial
          color="#2b6fd6"
          emissive="#0e2a5e"
          emissiveIntensity={0.5}
          roughness={0.65}
          metalness={0.15}
        />
      </mesh>
      {/* atmosphere halo (normal-blended back-side shell) */}
      <mesh scale={1.18}>
        <sphereGeometry args={[0.18, 48, 48]} />
        <meshBasicMaterial
          color="#5cc8ff"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export default Earth;
