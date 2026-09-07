import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Group, PointLight } from "three";
import { CanvasGuard } from "./CanvasGuard";
import { ensurePointerTracking, pointerState } from "./pointer";
import { journeyState } from "./journey";
import { WAYPOINTS, JOURNEY_DEPTH, type Waypoint } from "./waypoints";
import { ScrollTrigger } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";

const BASE_COUNT = 46;

/**
 * Moves the camera through the journey. `journeyState.progress` (written
 * once per scroll frame by a single page-wide ScrollTrigger — see the
 * effect below) is the target; the camera eases toward it rather than
 * snapping there, which is what gives the movement weight/inertia instead
 * of feeling like a scrollbar. A slow idle bob keeps the shot from ever
 * looking perfectly static, and a pointer-driven tilt is the site-wide
 * version of the "the page reacts to you" cue.
 */
function CameraRig() {
  useEffect(() => {
    ensurePointerTracking();
  }, []);

  useFrame(({ camera, clock }) => {
    const targetZ = -journeyState.progress * JOURNEY_DEPTH;
    camera.position.z += (targetZ - camera.position.z) * 0.07;
    camera.position.y = Math.sin(clock.elapsedTime * 0.15) * 0.15;
    camera.rotation.y += (pointerState.x * 0.035 - camera.rotation.y) * 0.04;
    camera.rotation.x += (-pointerState.y * 0.02 - camera.rotation.x) * 0.04;
  });

  return null;
}

/**
 * One beat of the journey: a small cluster of embers and a point light
 * sitting at a fixed depth along the camera's path. Its own presence —
 * how visible/bright it is — is entirely a function of how close the
 * camera currently is to it, recomputed every frame; nothing here reacts
 * to React state, so 13 of these cost nothing when idle.
 */
function WaypointLayer({ waypoint, z, falloff }: { waypoint: Waypoint; z: number; falloff: number }) {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);

  useFrame(({ camera }) => {
    const distance = Math.abs(camera.position.z - z);
    const t = Math.max(0, 1 - distance / falloff);
    const presence = t * t * (3 - 2 * t); // smoothstep — no hard cuts as beats hand off to each other
    if (groupRef.current) groupRef.current.scale.setScalar(0.3 + presence * 0.85);
    if (lightRef.current) lightRef.current.intensity = waypoint.lightIntensity * presence * 5;
  });

  return (
    <group ref={groupRef} position={[0, 0, z]}>
      <pointLight ref={lightRef} color={waypoint.lightColor} intensity={0} distance={22} decay={2} />
      <Sparkles
        count={Math.round(BASE_COUNT * waypoint.density)}
        scale={[waypoint.spread * 2, waypoint.spread * 1.4, waypoint.spread]}
        size={3}
        speed={0.2}
        opacity={0.6}
        color={waypoint.color}
        noise={1}
      />
    </group>
  );
}

/**
 * The persistent "world" the visitor's camera travels through for the
 * entire visit — one fixed, full-viewport canvas mounted once in App,
 * behind every section. It does NOT replace the real photography and video
 * (those stay exactly where they were, fully opaque, carrying the actual
 * content); it is the near-black depth those chambers sit in and the
 * connective tissue between them, so scrolling drives one continuous
 * camera move — darkness, to embers, to fire, through the kitchen and the
 * coals, past the picanha at its closest, out through the carving and the
 * dining room, to a last quiet ember at the reservation — rather than a
 * series of independent section reveals.
 *
 * Skipped entirely under reduced motion (the page falls back to its plain
 * near-black background, same as before this layer existed) and scaled
 * down on mobile (lower DPR, tighter falloff so fewer beats render work at
 * once, no antialiasing).
 */
export default function CinematicWorld() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (reducedMotion) return;
    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        journeyState.progress = self.progress;
      },
    });
    return () => trigger.kill();
  }, [reducedMotion]);

  if (reducedMotion) return null;

  const falloff = isMobile ? 15 : 19;

  return (
    <CanvasGuard>
      <Canvas
        gl={{ alpha: false, antialias: false, powerPreference: "low-power" }}
        dpr={isMobile ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 0], fov: 50, near: 0.1, far: 120 }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#070605", 6, isMobile ? 42 : 58]} />
        <ambientLight intensity={0.12} />
        <CameraRig />
        <Suspense fallback={null}>
          {WAYPOINTS.map((waypoint) => (
            <WaypointLayer key={waypoint.label} waypoint={waypoint} z={-waypoint.at * JOURNEY_DEPTH} falloff={falloff} />
          ))}
        </Suspense>
      </Canvas>
    </CanvasGuard>
  );
}
