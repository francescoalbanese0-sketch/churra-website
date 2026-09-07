import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import { useReducedMotion } from "../lib/useReducedMotion";

/**
 * Fades/rises the given elements in once, as `containerRef` crosses into view.
 * A no-op (simple opacity swap) under prefers-reduced-motion.
 */
export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  targets: RefObject<HTMLElement | null>[],
  options?: { start?: string; stagger?: number },
) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const els = targets.map((t) => t.current).filter((el): el is HTMLElement => !!el);
    if (!containerRef.current || els.length === 0) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(els, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(els, { opacity: 0, y: 40 });
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: options?.stagger ?? 0.12,
        scrollTrigger: {
          trigger: containerRef.current,
          start: options?.start ?? "top 70%",
          once: true,
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
}

export { ScrollTrigger };
