import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";
import styles from "./Chef.module.css";

const LINES = [
  "Bevor das erste Stück den Tisch erreicht, wird die Klinge geschärft – Zug um Zug, am Wetzstahl.",
  "Gianfranco trägt den Spiess direkt an Ihren Tisch und schneidet das Fleisch vor Ihren Augen: heiss, saftig, genau im richtigen Moment.",
  "Kein Teller aus der Küche, kein Warten. Nur Feuer, Stahl und Handwerk.",
];

/** Number of knife strokes across the pinned scroll distance. */
const STROKES = 4;

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * The chef sharpening his knife, driven by scroll: two aligned frames
 * (blade low / blade against the steel) snap back and forth as the visitor
 * scrolls, a glint runs along the steel on every stroke, and the story is
 * told line by line beside him.
 */
export function Chef() {
  const rootRef = useRef<HTMLElement>(null);
  const frameARef = useRef<HTMLImageElement>(null);
  const frameBRef = useRef<HTMLImageElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<SVGGElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35,
          onUpdate: (self) => {
            const p = self.progress;
            // --- the stroke: hold on a frame, snap quickly to the other
            const phase = (p * STROKES) % 1;
            const b = phase < 0.5 ? smooth((phase - 0.3) / 0.14) : 1 - smooth((phase - 0.8) / 0.14);
            if (frameBRef.current) frameBRef.current.style.opacity = String(b);
            const switching = 1 - Math.abs(b - 0.5) * 2; // 1 in the middle of a snap
            if (frameARef.current) frameARef.current.style.filter = `blur(${switching * 1.2}px)`;
            if (frameBRef.current) frameBRef.current.style.filter = `blur(${switching * 1.2}px)`;
            // --- glint travelling along the steel while the blade is up
            if (glintRef.current) {
              // runs from the tip of the steel (130,1030) towards the handle (700,1223) while the blade is up
              const g = Math.min(1, Math.max(0, (phase - 0.42) / 0.36));
              const x = 130 + g * 570;
              const y = 1030 + g * 193;
              glintRef.current.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
              glintRef.current.setAttribute("opacity", String(b > 0.5 ? Math.sin(g * Math.PI) : 0));
            }
            if (sparkRef.current) sparkRef.current.setAttribute("opacity", String(switching * 0.9));
            // --- slow push-in over the whole section
            if (mediaRef.current) mediaRef.current.style.transform = `scale(${1 + p * 0.07})`;
            // --- story
            if (titleRef.current) {
              const t = smooth(p / 0.08);
              titleRef.current.style.opacity = String(t);
              titleRef.current.style.transform = `translateY(${(1 - t) * 24}px)`;
            }
            lineRefs.current.forEach((el, i) => {
              if (!el) return;
              const start = 0.14 + i * 0.22;
              const t = smooth((p - start) / 0.1);
              if (isMobile) {
                // phones: one line at a time in the same place
                const last = i === LINES.length - 1;
                const out = last ? 0 : smooth((p - (start + 0.2)) / 0.06);
                el.style.opacity = String(Math.max(0, t - out));
              } else {
                el.style.opacity = String(0.12 + t * 0.88);
              }
              el.style.transform = `translateY(${(1 - t) * 18}px)`;
            });
          },
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion, isMobile]);

  return (
    <section ref={rootRef} id="passador" className={`${styles.section} ${reducedMotion ? styles.static : ""}`}>
      <div className={styles.stage}>
        <div className={styles.mediaCol}>
          <div ref={mediaRef} className={styles.media}>
            <div className={styles.box}>
            <img
              ref={frameARef}
              src="/chef/chef-a.jpg"
              alt="Chef Gianfranco schärft sein Messer am Wetzstahl"
              className={styles.frame}
              loading="lazy"
            />
            <img ref={frameBRef} src="/chef/chef-b.jpg" alt="" aria-hidden="true" className={`${styles.frame} ${styles.frameB}`} loading="lazy" />
            {/* Same coordinate space as the photos (1026×1600, anchored top) so the
                light sits exactly on the steel whatever the viewport shape. */}
            <svg className={styles.fx} viewBox="0 0 1026 1600" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
              <defs>
                <radialGradient id="chefGlint">
                  <stop offset="0" stopColor="#fff6e2" stopOpacity="0.95" />
                  <stop offset="0.45" stopColor="#ffd296" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#ffd296" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="chefSpark">
                  <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g ref={glintRef} opacity="0">
                <ellipse cx="0" cy="0" rx="90" ry="9" fill="url(#chefGlint)" transform="rotate(18.7)" />
              </g>
              <circle ref={sparkRef} cx="258" cy="1072" r="150" fill="url(#chefSpark)" opacity="0" />
            </svg>
            </div>
          </div>
          <div className={styles.fade} aria-hidden="true" />
        </div>

        <div className={styles.text}>
          <p className={`label ${styles.eyebrow}`}>Chef Gianfranco</p>
          <h2 ref={titleRef} className={styles.title}>
            Die Klinge
            <br />
            zuerst.
          </h2>
          <div className={styles.lines}>
          {LINES.map((l, i) => (
            <p
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={styles.line}
            >
              {l}
            </p>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
