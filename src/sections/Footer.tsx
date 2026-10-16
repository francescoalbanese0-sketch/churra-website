import { useRef } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import styles from "./Footer.module.css";
import { INSTAGRAM_HANDLE, INSTAGRAM_HREF } from "../lib/info";

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
        <span className={styles.name}>Churrascaria</span>
        <span className={styles.place}>Chur · Schweiz</span>
        <span className={styles.coming}>Ab 23. Oktober 2026 geöffnet</span>
      </div>
      <a href={INSTAGRAM_HREF} target="_blank" rel="noopener noreferrer" className={styles.insta} aria-label="Churra auf Instagram">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
        </svg>
        <span>{INSTAGRAM_HANDLE}</span>
      </a>
      <nav className={styles.legal}>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
      </nav>
    </footer>
  );
}
