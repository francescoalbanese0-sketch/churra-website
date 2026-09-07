import { useEffect, useRef, useState } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Loader.module.css";

interface LoaderProps {
  onDone: () => void;
}

/** Branded ignition screen shown while fonts/scene warm up — an ember catching light. */
export function Loader({ onDone }: LoaderProps) {
  const [hidden, setHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const emberWrapRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const minDelay = reducedMotion ? 250 : 1400;

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const start = Date.now();

    Promise.resolve(fontsReady).then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDelay - elapsed);
      window.setTimeout(() => {
        if (cancelled) return;
        // Guard against refs from an already-unmounted instance (e.g. a hot
        // reload swapping this component out while this timer was in flight)
        // — skip straight to done rather than animating nothing.
        if (!emberWrapRef.current || !markRef.current || !rootRef.current) {
          setHidden(true);
          onDone();
          return;
        }
        const tl = gsap.timeline({
          onComplete: () => {
            setHidden(true);
            onDone();
          },
        });
        // Sequenced with no overlap: every piece of the loader's OWN content
        // (ember + wordmark) must be fully gone before the backdrop starts
        // revealing the hero underneath — otherwise, for a brief window, the
        // loader's "IL PASSAGGIO" mark visibly double-exposes over the real
        // hero headline as both fade at once.
        tl.to(emberWrapRef.current, { opacity: 0, scale: 1.4, duration: 0.35, ease: "power2.in" }, 0);
        tl.to(markRef.current, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
        tl.to(rootRef.current, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 0.38);
      }, remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [onDone, reducedMotion]);

  if (hidden) return null;

  return (
    <div ref={rootRef} className={styles.loader} aria-hidden="true">
      <div ref={emberWrapRef} className={styles.emberWrap}>
        <div className={styles.ember} />
      </div>
      <span ref={markRef} className={styles.mark}>
        IL PASSAGGIO
      </span>
    </div>
  );
}
