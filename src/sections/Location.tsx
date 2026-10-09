import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./Location.module.css";

import { PHONE_DISPLAY, PHONE_HREF, EMAIL as EMAIL_DISPLAY, EMAIL_HREF, MAPS_HREF, OPENING_LABEL, HOURS } from "../lib/info";

export function Location() {
  const rootRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const addressRef = useRef<HTMLParagraphElement>(null);
  const phoneRef = useRef<HTMLAnchorElement>(null);
  const emailRef = useRef<HTMLAnchorElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const reserveCtaRef = useRef<HTMLAnchorElement>(null);
  const mapsCtaRef = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const targets = [
      eyebrowRef.current,
      nameRef.current,
      taglineRef.current,
      addressRef.current,
      phoneRef.current,
      emailRef.current,
      dateRef.current,
      hoursRef.current,
      reserveCtaRef.current,
      mapsCtaRef.current,
    ].filter((el): el is NonNullable<typeof el> => !!el);
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        if (pathRef.current) gsap.set(pathRef.current, { strokeDashoffset: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y: 30 });

      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(pathRef.current, {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: "power2.inOut",
          scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
        });
      }

      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
      });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={rootRef} id="kontakt" className={styles.section}>
      <svg className={styles.pin} viewBox="0 0 64 88" fill="none" aria-hidden="true">
        <path
          ref={pathRef}
          d="M32 2C16 2 3 15 3 31c0 22 29 55 29 55s29-33 29-55C61 15 48 2 32 2Z"
          stroke="var(--gold)"
          strokeWidth="1.4"
        />
        <circle cx="32" cy="31" r="9" stroke="var(--gold)" strokeWidth="1.2" />
      </svg>

      <p ref={eyebrowRef} className={`label ${styles.eyebrow}`}>
        05 — Kontakt
      </p>

      <p ref={nameRef} className={styles.name}>
        Churra
      </p>
      <p ref={taglineRef} className={`label ${styles.tagline}`}>
        Churrascaria · Brasilianisches Steakhouse
      </p>

      <p ref={addressRef} className={styles.address}>
        Theaterweg 7
        <br />
        7000 Chur
        <br />
        Schweiz
      </p>

      <div className={styles.contactLinks}>
        <a ref={phoneRef} href={PHONE_HREF} className={styles.phone}>
          {PHONE_DISPLAY}
        </a>
        <a ref={emailRef} href={EMAIL_HREF} className={styles.email}>
          {EMAIL_DISPLAY}
        </a>
      </div>

      <p ref={dateRef} className={styles.date}>
        {OPENING_LABEL}
      </p>

      <div ref={hoursRef} className={styles.hours}>
        <p className={`label ${styles.hoursTitle}`}>Öffnungszeiten</p>
        <dl className={styles.hoursList}>
          {HOURS.map((h) => (
            <div key={h.day} className={styles.hoursRow}>
              <dt>{h.day}</dt>
              <dd>{h.times.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.actions}>
        <a ref={reserveCtaRef} href="#reservieren" className={styles.cta}>
          Tisch reservieren
        </a>
        <a href={EMAIL_HREF} className={`${styles.cta} ${styles.ctaGhost}`}>
          Per E-Mail anfragen
        </a>
        <a
          ref={mapsCtaRef}
          href={MAPS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.cta} ${styles.ctaGhost}`}
        >
          Route planen
        </a>
      </div>
    </section>
  );
}
