import { useRef } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import styles from "./Footer.module.css";

/**
 * The closing signature: the story ends, the fire disappears, the bull
 * remains. Deliberately minimal — no nav, no links, nothing competing with
 * the mark itself.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const bullRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useScrollReveal(rootRef, [bullRef, captionRef], { start: "top 75%", stagger: 0.25 });

  return (
    <footer ref={rootRef} className={styles.footer}>
      <img
        ref={bullRef}
        src="/brand/churra-bull.png"
        alt="CHURRA"
        className={styles.bull}
      />
      <div ref={captionRef} className={styles.caption}>
        <span className={styles.name}>Churrascaría</span>
        <span className={styles.place}>Chur · Schweiz</span>
        <span className={styles.coming}>Coming October 2026</span>
      </div>
    </footer>
  );
}
