import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Atmosphere.module.css";

/**
 * The section that tells the visitor "this is a real restaurant" — a single
 * photographic moment of a set table. The image drifts like a slow dolly
 * move (scale + a faint vertical pan); the text is the "foreground" layer,
 * entering from the side and drifting at a visibly different speed, so the
 * two layers read as depth rather than a flat picture with a caption.
 */
export function Atmosphere() {
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const targets = [eyebrowRef.current, lineRef.current].filter((el): el is NonNullable<typeof el> => !!el);
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, x: 0 });
        return;
      }

      // Foreground text: enters from the side, not from below.
      gsap.set(targets, { opacity: 0, x: -36 });
      gsap.to(targets, {
        opacity: 1,
        x: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
      });

      // Background: a slow dolly — scale plus a faint vertical pan.
      if (imgRef.current) {
        gsap.fromTo(
          imgRef.current,
          { scale: 1.12, yPercent: -3 },
          {
            scale: 1,
            yPercent: 3,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      }

      // The text layer moves noticeably more than the image — the
      // foreground/background speed difference that sells the depth.
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { y: 70 },
          {
            y: -70,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={rootRef} className={styles.section}>
      <div className={styles.mediaWrap} aria-hidden="true">
        <img ref={imgRef} src="/photos/tisch.jpg" alt="" className={styles.media} loading="lazy" />
        <div className={styles.scrim} />
      </div>

      <div ref={contentRef} className={styles.content}>
        <p ref={eyebrowRef} className="label">
          Der Ort
        </p>
        <p ref={lineRef} className={styles.line}>
          Kein Konzept auf einem Bildschirm.
          <br />
          Ein Tisch, ein Feuer, ein Abend in Chur.
        </p>
      </div>
    </section>
  );
}
