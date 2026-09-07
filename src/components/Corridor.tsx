import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Corridor.module.css";

interface CorridorProps {
  /** A single word drifting past as the camera travels through this gap —
   *  omit for a purely wordless passage where the world alone carries it. */
  word?: string;
  height?: string;
}

/**
 * A deliberately empty stretch of the journey: no photography, no card, no
 * "section" at all — just the CinematicWorld canvas showing through, with
 * at most one word drifting past. This is where the "camera moving through
 * a continuous environment" the brief asks for is most legible, bridging
 * chambers of real content (Hero's fire, the kitchen/charcoal photography,
 * the dining room) that would otherwise cut directly from one to the next.
 * Used sparingly — exactly two crossings on the whole site — so it reads as
 * a deliberate breath, not a repeated device.
 */
export function Corridor({ word, height = "60vh" }: CorridorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !rootRef.current || !wordRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
        defaults: { ease: "none" },
      });
      tl.fromTo(wordRef.current, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0 }, 0);
      tl.to(wordRef.current, { opacity: 0, yPercent: -30 }, 0.6);
    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  if (reducedMotion) {
    // No scroll-jacked camera to bridge under reduced motion — collapse to
    // a small, calm gap instead of an empty stretch with nothing in it.
    return <div className={styles.corridorStill} aria-hidden="true" />;
  }

  return (
    <div ref={rootRef} className={styles.corridor} style={{ height }} aria-hidden={!word}>
      {word && (
        <p ref={wordRef} className={styles.word}>
          {word}
        </p>
      )}
    </div>
  );
}
