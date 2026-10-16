import { useRef } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import { PHONE_SHORT, PHONE_HREF } from "../lib/info";
import styles from "./Groups.module.css";

/** Groups & celebrations — its own section (fire-lit grill photo), separate from the Christmas offer. */
export function Groups() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  useScrollReveal(rootRef, [headRef, textRef, boxRef, ctaRef], { start: "top 65%", stagger: 0.16 });

  return (
    <section ref={rootRef} id="gruppen" className={styles.section}>
      <div className={styles.media} aria-hidden="true">
        <img src="/photos/feiern.jpg" alt="" loading="lazy" />
        <div className={styles.scrim} />
      </div>

      <div className={styles.content}>
        <div ref={headRef} className={styles.head}>
          <p className={`label ${styles.eyebrow}`}>Gruppen &amp; Feiern</p>
          <h2 className={styles.title}>
            Feiern Sie
            <br />
            mit uns.
          </h2>
        </div>

        <div ref={textRef} className={styles.text}>
          <p className={styles.textTitle}>Reservierung für Gruppen</p>
          <p>
            Wir freuen uns auf Ihre Gruppe – bitte reservieren Sie frühzeitig unter{" "}
            <a href={PHONE_HREF}>{PHONE_SHORT}</a>.
          </p>
        </div>

        <div ref={boxRef} className={styles.box}>
          <span className={styles.badge}>Geburtstags-Special</span>
          <p className={styles.boxTitle}>Das Geburtstagskind isst gratis.</p>
          <p className={styles.boxStrong}>Nur Abendessen</p>
          <p className={styles.boxNote}>Gilt am Tag des Geburtstags bei einer Gruppenreservierung.</p>
        </div>

        <div ref={ctaRef} className={styles.actions}>
          <a href={PHONE_HREF} className={styles.cta}>
            Gruppe anfragen · {PHONE_SHORT}
          </a>
        </div>
      </div>
    </section>
  );
}
