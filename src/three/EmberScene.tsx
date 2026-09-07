import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Group } from "three";
import { CanvasGuard } from "./CanvasGuard";
import { ensurePointerTracking, pointerState } from "./pointer";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";

interface EmberSceneProps {
  /** "warm" = the fire is the subject of this moment (Hero, Feuer-heavy
   *  beats). "smoky" = a calmer, cooler ambient drift for quieter moments. */
  variant?: "warm" | "smoky";
  /** Lower particle counts for constrained/mobile contexts. */
  density?: "full" | "low";
}

/**
 * Tilts its children a few degrees toward the pointer — the "the page
 * reacts to you" cue the brief asks for on desktop, kept subtle enough to
 * read as atmosphere rather than a gimmick. Touch devices simply never move
 * it (pointerState stays at its 0,0 default until a mouse moves).
 */
function ParallaxGroup({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);

  useEffect(() => {
    ensurePointerTracking();
  }, []);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    group.rotation.y += (pointerState.x * 0.05 - group.rotation.y) * 0.03;
    group.rotation.x += (-pointerState.y * 0.025 - group.rotation.x) * 0.03;
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * The one WebGL "atmosphere" layer used across the site: a drifting field of
 * embers with a warm point light standing in for the depth/lighting/spatial
 * feeling the brief asks Three.js for. Deliberately does NOT model any food,
 * fire, or restaurant geometry — the real photography and video carry all of
 * that; this only adds the air between the viewer and the scene.
 */
export default function EmberScene({ variant = "warm", density = "full" }: EmberSceneProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  if (reducedMotion) return null;

  const scale = density === "low" || isMobile ? 0.55 : 1;
  const warm = variant === "warm";

  return (
    <CanvasGuard>
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        dpr={isMobile ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <ambientLight intensity={0.25} />
        <pointLight
          position={[0, -2.4, 3]}
          intensity={warm ? 7 : 2.5}
          color={warm ? "#ff7a30" : "#e7c98a"}
          distance={14}
          decay={2}
        />
        <Suspense fallback={null}>
          <ParallaxGroup>
            <Sparkles
              count={Math.round((warm ? 46 : 26) * scale)}
              scale={[6.5, 4.5, 3]}
              size={warm ? 3.2 : 2.2}
              speed={0.25}
              opacity={warm ? 0.6 : 0.4}
              color={warm ? "#ffb066" : "#e7c98a"}
              noise={1}
            />
            {warm && (
              <Sparkles
                count={Math.round(20 * scale)}
                scale={[5, 3, 2.5]}
                size={1.6}
                speed={0.4}
                opacity={0.4}
                color="#ff6a2b"
                noise={1.4}
              />
            )}
          </ParallaxGroup>
        </Suspense>
      </Canvas>
    </CanvasGuard>
  );
}
