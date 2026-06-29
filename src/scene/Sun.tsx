/**
 * Sun — emissive central star + the scene's point light.
 */
export function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      {/* faint glow halo */}
      <mesh>
        <sphereGeometry args={[0.66, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.08} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3} distance={0} decay={0} />
    </group>
  );
}

export default Sun;
