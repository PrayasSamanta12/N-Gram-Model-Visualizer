import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";

/* ── Colors ── */
const CLR_INPUT = "#76ff03";
const CLR_CTX = "#00e5ff";
const CLR_PRED = "#d500f9";

/* ── Layer Y positions ── */
const Y_INPUT = 0;
const Y_MODEL = 5;
const Y_OUTPUT = 10;

/* ── Glowing sphere ── */
function GlowSphere({ position, radius = 0.35, color, emissiveIntensity = 0.3 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.04);
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        metalness={0.3}
        roughness={0.4}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/* ── Animated ring ── */
function AnimatedRing({ position, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.elapsedTime * 0.5;
      ref.current.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.9, 0.03, 16, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </mesh>
  );
}

/* ── Label (HTML in 3D) ── */
function Label({ position, text, color = "#c0c0d0", fontSize = "11px", offsetY = -0.7 }) {
  return (
    <Html position={[position[0], position[1] + offsetY, position[2]]} center distanceFactor={15} zIndexRange={[10, 0]}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize,
        color,
        textShadow: `0 0 6px ${color}40`,
        whiteSpace: "nowrap",
        userSelect: "none",
        pointerEvents: "none",
      }}>
        {text}
      </div>
    </Html>
  );
}

/* ── Curved tube edge ── */
function FlowTube({ from, to, color, radius = 0.04, opacity = 0.5 }) {
  const geo = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 1.2;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return new THREE.TubeGeometry(curve, 20, radius, 8, false);
  }, [from, to, radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={opacity}
        metalness={0.2}
        roughness={0.5}
      />
    </mesh>
  );
}

/* ── Curved line (for input chain) ── */
function CurvedLine({ from, to, color, opacity = 0.25 }) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 0.3;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(16);
  }, [from, to]);
  return <Line points={points} color={color} lineWidth={1} transparent opacity={opacity} />;
}

/* ── Background particles ── */
function Particles() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) {
      const pos = ref.current.geometry.attributes.position.array;
      for (let i = 0; i < 600; i++) {
        pos[i * 3 + 1] += Math.sin(clock.elapsedTime + i * 0.5) * 0.001;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={600} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#334466" size={0.06} transparent opacity={0.5} />
    </points>
  );
}

/* ── Main scene content ── */
function SceneContent({ data }) {
  if (!data || !data.words || !data.words.length) {
    return (
      <>
        <Particles />
        <gridHelper args={[30, 30, "#1a1a2e", "#1a1a2e"]} position={[0, -1, 0]} />
        <OrbitControls target={[0, 2, 0]} enableDamping dampingFactor={0.06} minDistance={6} maxDistance={50} maxPolarAngle={Math.PI * 0.85} />
      </>
    );
  }

  const { words, source, context = [], candidates = [] } = data;
  const totalInputW = (words.length - 1) * 2.5;
  const startX = -totalInputW / 2;

  const edgeColor = source === "trigram" ? CLR_CTX : CLR_PRED;
  const maxProb = candidates.length > 0 ? candidates[0].probability : 1;
  const totalCandW = (candidates.length - 1) * 3;
  const candStartX = -totalCandW / 2;

  return (
    <>
      <Particles />
      <gridHelper args={[30, 30, "#1a1a2e", "#1a1a2e"]} position={[0, -1, 0]} />
      <OrbitControls target={[0, Y_MODEL, 0]} enableDamping dampingFactor={0.06} minDistance={6} maxDistance={50} maxPolarAngle={Math.PI * 0.85} />

      {/* ── INPUT LAYER ── */}
      {words.map((w, i) => {
        const x = startX + i * 2.5;
        const isCtx = context.includes(w) && i >= words.length - context.length;
        const col = isCtx ? CLR_CTX : CLR_INPUT;
        return (
          <group key={`input-${i}-${w}`}>
            <GlowSphere position={[x, Y_INPUT, 0]} color={col} emissiveIntensity={isCtx ? 0.6 : 0.2} />
            <Label position={[x, Y_INPUT, 0]} text={w} color={col} />
            {i > 0 && (
              <CurvedLine from={[startX + (i - 1) * 2.5, Y_INPUT, 0]} to={[x, Y_INPUT, 0]} color={CLR_INPUT} />
            )}
          </group>
        );
      })}
      <Label position={[totalInputW / 2 + 2.5, Y_INPUT, 0]} text="INPUT" color={CLR_INPUT} fontSize="10px" offsetY={0} />

      {/* ── MODEL LAYER ── */}
      {source && (
        <group>
          <GlowSphere position={[0, Y_MODEL, 0]} radius={0.55} color={edgeColor} emissiveIntensity={0.5} />
          <AnimatedRing position={[0, Y_MODEL, 0]} color={edgeColor} />
          <Label
            position={[0, Y_MODEL, 0]}
            text={source === "trigram" ? `Trigram: (${context[0]}, ${context[1]}) → ?` : `Bigram: (${context[0]}) → ?`}
            color={edgeColor}
            offsetY={-0.9}
          />
          <Label position={[totalInputW / 2 + 2.5, Y_MODEL, 0]} text="MODEL" color={edgeColor} fontSize="10px" offsetY={0} />

          {/* edges from context to model */}
          {words.map((w, i) => {
            const isCtx = context.includes(w) && i >= words.length - context.length;
            if (!isCtx) return null;
            const x = startX + i * 2.5;
            return <FlowTube key={`ctx-edge-${i}`} from={[x, Y_INPUT, 0]} to={[0, Y_MODEL, 0]} color={edgeColor} />;
          })}
        </group>
      )}

      {/* ── OUTPUT LAYER ── */}
      {candidates.map((c, i) => {
        const x = candStartX + i * 3;
        const probNorm = c.probability / maxProb;
        const radius = 0.2 + probNorm * 0.3;
        const barH = probNorm * 2.0;
        return (
          <group key={`cand-${i}-${c.word}`}>
            <GlowSphere position={[x, Y_OUTPUT, 0]} radius={radius} color={CLR_PRED} emissiveIntensity={0.2 + probNorm * 0.5} />
            <Label position={[x, Y_OUTPUT, 0]} text={c.word} color={CLR_PRED} />
            {/* Probability bar */}
            <mesh position={[x, Y_OUTPUT + 0.8 + barH / 2, 0]}>
              <cylinderGeometry args={[0.06, 0.06, barH, 8]} />
              <meshStandardMaterial color={CLR_PRED} emissive={CLR_PRED} emissiveIntensity={0.3} transparent opacity={0.5 + probNorm * 0.4} />
            </mesh>
            <Label position={[x, Y_OUTPUT + 0.8 + barH, 0]} text={`${(c.probability * 100).toFixed(1)}%`} color="#888" fontSize="9px" offsetY={0.4} />
            <FlowTube from={[0, Y_MODEL, 0]} to={[x, Y_OUTPUT, 0]} color={CLR_PRED} radius={0.015 + probNorm * 0.03} opacity={0.15 + probNorm * 0.6} />
          </group>
        );
      })}
      {candidates.length > 0 && (
        <Label position={[totalCandW / 2 + 2.5, Y_OUTPUT, 0]} text="OUTPUT" color={CLR_PRED} fontSize="10px" offsetY={0} />
      )}
    </>
  );
}

/* ── Exported Canvas ── */
export default function ThreeScene({ data }) {
  return (
    <Canvas
      camera={{ position: [0, 6, 18], fov: 55, near: 0.1, far: 500 }}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      <ambientLight color="#334466" intensity={0.4} />
      <directionalLight position={[8, 15, 10]} intensity={0.6} />
      <pointLight position={[-6, 8, 6]} color="#00e5ff" intensity={1.0} distance={40} />
      <pointLight position={[6, 4, -6]} color="#d500f9" intensity={0.8} distance={40} />
      <SceneContent data={data} />
    </Canvas>
  );
}
