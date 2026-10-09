import { lazy, Suspense, useEffect, useRef } from "react";
import { ScrollTrigger } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";
import styles from "./PinnedSequence.module.css";

const EmberScene = lazy(() => import("../three/EmberScene"));

export interface SequencePhase {
  image: string;
  alt: string;
  /** CSS object-position for the full-screen crop, e.g. "50% 30%" */
  focus?: string;
  label: string;
  note: string;
}

interface PinnedSequenceProps {
  id?: string;
  eyebrow: string;
  phases: SequencePhase[];
  /** A single line folded into the pin's opening beat instead of a separate
   *  static block before it — dissolves within the first sliver of scroll,
   *  so the section reads as one continuous entry into the ritual rather
   *  than "text block, then section". */
  introLine?: string;
  /** Mounts the shared Three.js ember layer over the sequence. */
  ember?: boolean;
  /** Per-phase fire intensity (0–1, same length as `phases`) blended by the
   *  same crossfade weights as the imagery — e.g. full at "Feuer", low at a
   *  calmer "Zeit". Defaults to full intensity throughout. */
  heat?: number[];
}

/**
 * The core "scrollytelling" primitive behind Das Ritual and Das
 * Churrasco-Erlebnis: one scene stays on screen (CSS `position: sticky` —
 * simpler and more mobile-reliable than a GSAP-driven pin) while scroll
 * position crossfades between phases: fire becomes the skewer becomes the
 * meat, rather than three separate cards. Everything is driven off a single
 * scroll-progress read (no independent tweens), so it's fully scrubbable in
 * both directions and cheap: one ScrollTrigger, direct style writes.
 *
 * Reduced motion gets a plain stacked fallback — no scroll-jacking, no
 * sticky, just the phases laid out and faded in normally.
 */
export function PinnedSequence({ id, eyebrow, phases, introLine, ember, heat }: PinnedSequenceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const introRef = useRef<HTMLParagraphElement>(null);
  const emberRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const vhPerPhase = isMobile ? 70 : 100;

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;
    const layers = layerRefs.current.filter((el): el is HTMLDivElement => !!el);
    const dots = dotRefs.current.filter((el): el is HTMLSpanElement => !!el);
    const count = phases.length;
    const heatWeights = heat && heat.length === count ? heat : phases.map(() => 1);

    // Trapezoidal crossfade window per phase, with generous overlap so
    // consecutive scenes dissolve into each other instead of ever cutting
    // to black. Scale ties directly to the same value: fully visible = 1,
    // settling in/out from a very slight zoom.
    const visibilityAt = (progress: number, index: number) => {
      const seg = 1 / count;
      const center = seg * (index + 0.5);
      const half = seg / 2;
      const overlap = seg * 0.4;
      const dist = Math.abs(progress - center);
      if (dist <= half - overlap) return 1;
      if (dist >= half + overlap) return 0;
      return 1 - (dist - (half - overlap)) / (overlap * 2);
    };

    const update = (progress: number) => {
      let heatSum = 0;
      layers.forEach((layer, i) => {
        const v = visibilityAt(progress, i);
        const img = layer.querySelector<HTMLElement>("[data-role='image']");
        const text = layer.querySelector<HTMLElement>("[data-role='text']");
        layer.style.opacity = String(v);
        if (img) img.style.transform = `scale(${1.06 - 0.06 * v})`;
        if (text) {
          text.style.transform = `translateY(${(1 - v) * 14}px)`;
          // The image can crossfade gently, but two phases' words sharing
          // the same spot both being partly legible reads as broken rather
          // than cinematic — so the text itself clears out faster than the
          // image beneath it, never leaving two captions readable at once.
          text.style.opacity = String(Math.max(0, Math.min(1, (v - 0.5) / 0.5)));
        }
        if (dots[i]) dots[i].style.opacity = v > 0.5 ? "1" : "0.35";
        heatSum += v * heatWeights[i];
      });
      if (emberRef.current) emberRef.current.style.opacity = String(Math.min(1, heatSum));
      // The folded-in intro line only belongs to the very first breath of
      // the pin — gone well before the first phase finishes crossfading in.
      if (introRef.current) introRef.current.style.opacity = String(Math.max(0, 1 - progress / 0.1));
    };

    update(0);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.4,
      onUpdate: (self) => update(self.progress),
    });

    return () => trigger.kill();
    // `phases` and `heat` are static per-mount props (each call site passes
    // its own literal array); re-running this on every render they'd cause
    // via identity would tear down and rebuild the ScrollTrigger for no
    // reason. `phases.length` alone is enough to react to a real change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, phases.length]);

  if (reducedMotion) {
    return (
      <section id={id} className={styles.staticSection}>
        <p className={`label ${styles.eyebrow}`}>{eyebrow}</p>
        {introLine && <p className={styles.staticIntro}>{introLine}</p>}
        <div className={styles.staticList}>
          {phases.map((phase) => (
            <div key={phase.label} className={styles.staticItem}>
              <img src={phase.image} alt={phase.alt} className={styles.staticImage} loading="lazy" />
              <div>
                <span className={styles.word}>{phase.label}</span>
                <span className={styles.note}>{phase.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      className={styles.sequence}
      style={{ height: `${phases.length * vhPerPhase}vh` }}
    >
      <div className={styles.stage}>
        <p className={`label ${styles.eyebrow}`}>{eyebrow}</p>

        {introLine && (
          <p ref={introRef} className={styles.introLine}>
            {introLine}
          </p>
        )}

        {ember && (
          <div ref={emberRef} className={styles.emberLayer} aria-hidden="true">
            <Suspense fallback={null}>
              <EmberScene variant="warm" density={isMobile ? "low" : "full"} />
            </Suspense>
          </div>
        )}

        {phases.map((phase, i) => (
          <div
            key={phase.label}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            className={styles.layer}
          >
            <div className={styles.imageWrap} data-role="image">
              <img
                src={phase.image}
                alt={phase.alt}
                className={styles.image}
                style={phase.focus ? { objectPosition: phase.focus } : undefined}
                loading="lazy"
              />
              <div className={styles.scrim} />
            </div>
            <div className={styles.text} data-role="text">
              <span className={styles.index}>0{i + 1}</span>
              <span className={styles.word}>{phase.label}</span>
              <span className={styles.note}>{phase.note}</span>
            </div>
          </div>
        ))}

        <div className={styles.dots} aria-hidden="true">
          {phases.map((phase, i) => (
            <span
              key={phase.label}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className={styles.dot}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
