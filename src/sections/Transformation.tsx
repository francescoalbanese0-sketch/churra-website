import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Transformation.module.css";

/**
 * The world of CHURRA, entered for the first time. The image fades up out
 * of black as it arrives (meeting the darkness the hero scrolls into) and
 * keeps a slow push-in for its full time on screen; the text drifts at its
 * own, slightly different speed — two layers moving independently rather
 * than one flat image with words on top.
 */
export function Transformation() {
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const targets = [eyebrowRef.current, line1Ref.current, line2Ref.current].filter(
      (el): el is HTMLParagraphElement => !!el,
    );
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y: 26 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.16,
        scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
      });

      if (imgRef.current) {
        // Fades up from black as the section arrives (continuing the hero's
        // own fade to black), then keeps a slow continuous push-in for as
        // long as the section is on screen.
        gsap.fromTo(
          imgRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "top 35%", scrub: 0.6 },
          },
        );
        gsap.fromTo(
          imgRef.current,
          { scale: 1.12 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      }

      // The text layer drifts at its own pace — a second, independent
      // "camera speed" against the image's push-in, felt more than seen.
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { y: 50 },
          {
            y: -50,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={rootRef} id="konzept" className={styles.section}>
      <div className={styles.mediaWrap} aria-hidden="true">
        <img ref={imgRef} src="/atmosphere/transformation.jpg" alt="" className={styles.media} loading="lazy" />
        <div className={styles.scrim} />
      </div>

      <div ref={contentRef} className={styles.content}>
        <p ref={eyebrowRef} className={`label ${styles.eyebrow}`}>
          01 — Die Verwandlung
        </p>
        <p ref={line1Ref} className={styles.line}>
          Viele Jahre lang eine italienische Adresse.
        </p>
        <p ref={line2Ref} className={`${styles.line} ${styles.ember}`}>
          Jetzt wird daraus Churra.
        </p>
      </div>
    </section>
  );
}
