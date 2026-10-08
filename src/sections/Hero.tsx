import { lazy, Suspense, useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";
import { EmberField } from "../components/EmberField";
import styles from "./Hero.module.css";

// The Three.js atmosphere layer is real weight (three + fiber + drei) that
// has no business blocking the very first paint of the site — deferred so
// the hero's text/video/CSS can be interactive well before it arrives.
const EmberScene = lazy(() => import("../three/EmberScene"));

const HERO_VIDEO_SRC = "/video/picanha-hero-rotation-01.mp4";
const HERO_POSTER_SRC = "/video/picanha-hero-poster.jpg";

interface HeroProps {
  reveal: boolean;
}

export function Hero({ reveal }: HeroProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const rootRef = useRef<HTMLDivElement>(null);
  const line1 = useRef<HTMLSpanElement>(null);
  const line2 = useRef<HTMLSpanElement>(null);
  const line3 = useRef<HTMLSpanElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const sceneWrapRef = useRef<HTMLDivElement>(null);
  const scrollZoomRef = useRef<HTMLDivElement>(null);
  const mediaFrameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const darkenRef = useRef<HTMLDivElement>(null);
  const emberSceneRef = useRef<HTMLDivElement>(null);

  // Belt-and-braces: the autoplay/muted/playsInline attributes should be
  // enough on their own, but some browsers only honor autoplay reliably once
  // the element is actually in the DOM — nudge it explicitly and swallow any
  // rejection (falls back to the static poster frame, never throws).
  useEffect(() => {
    if (reducedMotion) return;
    videoRef.current?.play().catch(() => {});
  }, [reducedMotion]);

  // A barely-perceptible, continuous "camera breathing" on the footage
  // itself — independent of the entrance timeline below, and independent
  // of reduced-motion's one-time reveal. This is the one piece of motion
  // that never stops, so it stays extremely slow and small.
  useEffect(() => {
    if (reducedMotion || !mediaFrameRef.current) return;
    const tween = gsap.to(mediaFrameRef.current, {
      scale: 1.045,
      duration: 26,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  // The hero's OWN scroll-driven exit: as the visitor scrolls away, the
  // footage pushes subtly closer, the frame darkens toward the black that
  // the next section emerges from, and the typography breaks apart at
  // different speeds/depths — the quiet outgoing name barely moves, the
  // dominant word (closest to "camera") drifts and clears first. One
  // scrubbed timeline, no independent scroll listeners. This is the
  // "camera pushing into a close-up, then the room going dark" beat the
  // brief asks for as the visitor leaves the hero.
  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
        defaults: { ease: "none", duration: 1 },
      });
      if (scrollZoomRef.current) tl.to(scrollZoomRef.current, { scale: 1.32 }, 0);
      if (darkenRef.current) tl.to(darkenRef.current, { opacity: 0.94 }, 0);
      if (emberSceneRef.current) tl.to(emberSceneRef.current, { opacity: 0 }, 0);
      if (cueRef.current) tl.to(cueRef.current, { opacity: 0, duration: 0.2 }, 0);
      if (line1.current) tl.to(line1.current, { yPercent: -18, opacity: 0.2 }, 0);
      if (line2.current) tl.to(line2.current, { yPercent: -24, opacity: 0.1 }, 0);
      if (taglineRef.current) tl.to(taglineRef.current, { yPercent: -30, opacity: 0 }, 0);
      if (line3.current) tl.to(line3.current, { yPercent: -42, opacity: 0 }, 0);
      if (subRef.current) tl.to(subRef.current, { yPercent: -34, opacity: 0 }, 0);
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  // Desktop-only: the scene drifts a few pixels against the pointer — the
  // "the page reacts to you" cue from the brief, applied with a spring-like
  // lag (quickTo) rather than a 1:1 follow, so it reads as weight and depth
  // rather than a cursor-tracking gimmick. Never runs on touch devices
  // (no fine pointer) or under reduced motion.
  useEffect(() => {
    if (reducedMotion || isMobile || !sceneWrapRef.current) return;
    const el = sceneWrapRef.current;
    const moveX = gsap.quickTo(el, "x", { duration: 1.1, ease: "power3.out" });
    const moveY = gsap.quickTo(el, "y", { duration: 1.1, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      moveX(nx * -10);
      moveY(ny * -6);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion, isMobile]);

  useEffect(() => {
    if (!reveal) return;
    const ctx = gsap.context(() => {
      // Guard every target: refs can be momentarily null across a fast
      // reduced-motion toggle or a StrictMode double-invoked effect.
      const els = {
        line1: line1.current,
        line2: line2.current,
        line3: line3.current,
        tagline: taglineRef.current,
        sub: subRef.current,
        cue: cueRef.current,
        scene: sceneWrapRef.current,
      };
      const lines = [els.line1, els.line2, els.line3].filter((el): el is HTMLElement => !!el);

      if (reducedMotion) {
        gsap.set([...lines, els.tagline, els.sub, els.cue, els.scene].filter(Boolean), {
          opacity: 1,
          y: 0,
          clipPath: "none",
        });
        if (emberSceneRef.current) gsap.set(emberSceneRef.current, { opacity: 0 });
        return;
      }

      gsap.set(lines, { clipPath: "inset(0 0 100% 0)" });
      if (els.tagline) gsap.set(els.tagline, { opacity: 0, y: 10 });
      if (els.sub) gsap.set(els.sub, { opacity: 0, y: 14 });
      if (els.cue) gsap.set(els.cue, { opacity: 0 });
      // The scene opens like a lens iris — a small circle of firelight at
      // the frame's lower-third widening to reveal the whole scene — rather
      // than a flat fade. That's the "camera discovering the picanha"
      // moment the brief asks the hero to open with.
      if (els.scene) gsap.set(els.scene, { opacity: 0, scale: 1.08, clipPath: "circle(0% at 50% 58%)" });
      if (emberSceneRef.current) gsap.set(emberSceneRef.current, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      if (els.scene) {
        tl.to(
          els.scene,
          { opacity: 1, scale: 1, clipPath: "circle(120% at 50% 58%)", duration: 2.6, ease: "power2.out" },
          0,
        );
      }
      // Embers catch a beat before the iris finishes opening — fire arrives
      // just ahead of the image, not simultaneously with it.
      if (emberSceneRef.current) tl.to(emberSceneRef.current, { opacity: 0.85, duration: 2 }, 0.4);
      if (els.line1) tl.to(els.line1, { clipPath: "inset(0 0 0% 0)", duration: 1 }, 0.25);
      if (els.line2) tl.to(els.line2, { clipPath: "inset(0 0 0% 0)", duration: 0.8 }, 0.55);
      if (els.line3) tl.to(els.line3, { clipPath: "inset(0 0 0% 0)", duration: 1.1 }, 0.8);
      if (els.tagline) tl.to(els.tagline, { opacity: 1, y: 0, duration: 0.8 }, 1.5);
      if (els.sub) tl.to(els.sub, { opacity: 1, y: 0, duration: 0.9 }, 1.65);
      if (els.cue) tl.to(els.cue, { opacity: 1, duration: 0.8 }, 2.0);
    }, rootRef);

    return () => ctx.revert();
  }, [reveal, reducedMotion]);

  return (
    <section ref={rootRef} className={styles.hero} id="hero">
      <div ref={sceneWrapRef} className={styles.sceneWrap}>
        {/* Zero-cost CSS gradient behind the media — instant paint, and the
            ultimate fallback if the video/poster asset is slow or fails. */}
        <div className={styles.poster} aria-hidden="true" />
        <div ref={scrollZoomRef} className={styles.scrollZoom}>
          <div ref={mediaFrameRef} className={styles.mediaFrame}>
            {reducedMotion ? (
              // Static frame only — no autoplaying motion for users who asked for less of it.
              <img src={HERO_POSTER_SRC} alt="" className={styles.heroMedia} aria-hidden="true" />
            ) : (
              <video
                ref={videoRef}
                className={styles.heroMedia}
                src={HERO_VIDEO_SRC}
                poster={HERO_POSTER_SRC}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        {/* The deep atmosphere layer: a drifting Three.js ember field with
            its own warm light, sitting between the footage and the darken/
            vignette layers — the "depth and spatial feeling" the brief asks
            Three.js for, screen-blended so it only ever adds light, never a
            rectangle. Lazy-loaded and skipped entirely under reduced motion
            or on a WebGL-less browser (see EmberScene's own guard). */}
        {!reducedMotion && (
          <div ref={emberSceneRef} className={styles.emberScene} aria-hidden="true">
            <Suspense fallback={null}>
              <EmberScene variant="warm" density={isMobile ? "low" : "full"} />
            </Suspense>
          </div>
        )}
        {/* Fades in as the visitor scrolls away — meets the darkness the
            next section emerges from, so the cut reads as one continuous
            move deeper into the room rather than a hard section break. */}
        <div ref={darkenRef} className={styles.darken} aria-hidden="true" />
        {/* A few embers drifting between the viewer and the footage — the
            "foreground" layer of the depth the brief asks for. */}
        <EmberField />
        {/* Soft radial darkening at the frame edges so the video reads as
            part of the scene rather than a pasted-in rectangle. */}
        <div className={styles.vignette} aria-hidden="true" />
      </div>

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        <h1 className={styles.headline}>
          <span className={styles.lineClip}>
            <span ref={line1} className={`${styles.line} ${styles.lineQuiet}`}>
              IL PASSAGGIO
            </span>
          </span>
          <span className={styles.lineClip}>
            <span ref={line2} className={`${styles.line} ${styles.lineTiny}`}>
              wird zu
            </span>
          </span>
          <span className={styles.lineClip}>
            <span ref={line3} className={`${styles.line} ${styles.lineDominant}`}>
              CHURRA
            </span>
          </span>
        </h1>

        <p ref={taglineRef} className={styles.tagline}>
          Churrascaria · Brasilianisches Steakhouse
        </p>

        <div ref={subRef} className={styles.sub}>
          <p className={`label ${styles.subLine}`}>Eröffnung 23. Oktober 2026</p>
          <p className={`label ${styles.subLine}`}>Theaterweg 7 · Chur</p>
        </div>
      </div>

      <div ref={cueRef} className={styles.cue} aria-hidden="true">
        <span className={styles.cueLine} />
        <span className={styles.cueText}>Entdecken</span>
      </div>
    </section>
  );
}
