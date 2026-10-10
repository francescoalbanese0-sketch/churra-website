import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Christmas.module.css";

import { PHONE_SHORT as PHONE_DISPLAY, PHONE_HREF } from "../lib/info";

/** Commercial section for corporate/group Christmas dinners — same dark, fire-lit brand language, not a banner. */
export function Christmas() {
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headline1Ref = useRef<HTMLSpanElement>(null);
  const headline2Ref = useRef<HTMLSpanElement>(null);
  const priceRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const phoneRef = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const targets = [
      eyebrowRef.current,
      headline1Ref.current,
      headline2Ref.current,
      priceRef.current,
      ctaRef.current,
      phoneRef.current,
    ].filter((el): el is NonNullable<typeof el> => !!el);
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y: 22 });

      // A deliberate sequence, not a uniform stagger: the offer builds
      // beat by beat — WEIHNACHTSESSEN, then FÜR FIRMEN & GRUPPEN, a beat
      // of silence, the price, then the two ways to act.
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.85 },
        scrollTrigger: { trigger: rootRef.current, start: "top 60%", once: true },
      });
      if (eyebrowRef.current) tl.to(eyebrowRef.current, { opacity: 1, y: 0 }, 0);
      if (headline1Ref.current) tl.to(headline1Ref.current, { opacity: 1, y: 0 }, 0.25);
      if (headline2Ref.current) tl.to(headline2Ref.current, { opacity: 1, y: 0 }, 0.5);
      if (priceRef.current) tl.to(priceRef.current, { opacity: 1, y: 0, duration: 1 }, 1.05);
      if (ctaRef.current) tl.to(ctaRef.current, { opacity: 1, y: 0 }, 1.55);
      if (phoneRef.current) tl.to(phoneRef.current, { opacity: 1, y: 0 }, 1.8);

      if (imgRef.current) {
        gsap.fromTo(
          imgRef.current,
          { scale: 1.1 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={rootRef} id="firmen" className={styles.section}>
      <div className={styles.mediaWrap} aria-hidden="true">
        <img ref={imgRef} src="/atmosphere/christmas-table.jpg" alt="" className={styles.media} loading="lazy" />
        <div className={styles.scrim} />
      </div>

      <div className={styles.content}>
        <p ref={eyebrowRef} className={`label ${styles.eyebrow}`}>
          04 — Firmen &amp; Gruppen
        </p>

        <p className={styles.headline}>
          <span ref={headline1Ref} className={styles.headlineLine}>
            Weihnachtsessen
          </span>
          <span ref={headline2Ref} className={styles.headlineLine}>
            für Firmen &amp; Gruppen
          </span>
        </p>

        <p ref={priceRef} className={styles.price}>
          CHF 69.– <span>pro Person · exkl. Getränke</span>
        </p>

        <div className={styles.actions}>
          <a ref={ctaRef} href={PHONE_HREF} className={styles.cta}>
            Reservieren
          </a>
          <a ref={phoneRef} href={PHONE_HREF} className={styles.phone}>
            {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}
