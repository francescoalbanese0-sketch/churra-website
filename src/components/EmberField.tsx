import { useEffect, useRef } from "react";
import { useReducedMotion } from "../lib/useReducedMotion";
import styles from "./EmberField.module.css";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  driftPhase: number;
  opacity: number;
  life: number;
  maxLife: number;
}

/**
 * A handful of foreground embers drifting slowly upward over the hero —
 * pure Canvas2D, no WebGL/Three.js. This is the "foreground" layer the
 * brief asks for: a few soft, warm points of light between the viewer and
 * the video, cheap enough to never register as a performance cost and
 * restrained enough to read as atmosphere, not an effect.
 */
export function EmberField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const particles: Particle[] = [];
    const COUNT = 10; // deliberately sparse — this is atmosphere, not a shower

    function resize() {
      const canvasEl = canvas as HTMLCanvasElement;
      const rect = canvasEl.parentElement!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(p: Particle) {
      p.x = Math.random() * width;
      p.y = height * (0.55 + Math.random() * 0.45);
      p.size = 1 + Math.random() * 2.2;
      p.speed = 6 + Math.random() * 10;
      p.drift = (Math.random() - 0.5) * 14;
      p.driftPhase = Math.random() * Math.PI * 2;
      p.maxLife = 6 + Math.random() * 5;
      p.life = Math.random() * p.maxLife;
      p.opacity = 0;
    }

    for (let i = 0; i < COUNT; i++) {
      const p = {} as Particle;
      spawn(p);
      particles.push(p);
    }

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.maxLife) spawn(p);

        const t = p.life / p.maxLife;
        p.y -= p.speed * dt;
        p.x += Math.sin(p.life * 1.3 + p.driftPhase) * p.drift * dt;
        p.opacity = Math.sin(Math.PI * t) * 0.55;

        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `rgba(255, 200, 140, ${p.opacity})`);
        grad.addColorStop(0.4, `rgba(255, 120, 40, ${p.opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 80, 20, 0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
