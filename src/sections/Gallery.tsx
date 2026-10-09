import { useEffect, useRef } from "react";
import { gsap } from "../animations/gsap";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useIsMobile } from "../lib/useMediaQuery";
import styles from "./Gallery.module.css";

const ITEMS = [
  { src: "/photos/spiesse-am-tisch.jpg", title: "Vom Spiess an den Tisch", note: "Wurst, Huhn, Rind – Runde um Runde." },
  { src: "/photos/haehnchen.jpg", title: "Hähnchen vom Spiess", note: "Mariniert, knusprig, saftig." },
  { src: "/photos/teller.jpg", title: "Das Buffet", note: "Reis, Bohnen, Farofa und Salate – alles inbegriffen." },
  { src: "/photos/feijao.jpg", title: "Feijão", note: "Schwarze Bohnen nach brasilianischer Art." },
  { src: "/photos/saucen.jpg", title: "Saucen", note: "Die Begleiter für jedes Stück Fleisch." },
  { src: "/photos/schweinebauch.jpg", title: "Schweinebauch", note: "Mit knuspriger Kruste, frisch tranchiert." },
  { src: "/photos/dessert.jpg", title: "Desserts", note: "Drei wechselnde Kreationen." },
  { src: "/photos/wein.jpg", title: "Weine", note: "Ausgewählte Flaschen zum Fleisch." },
];

/**
 * "Mehr als Fleisch" — a film strip of the table: on desktop the page pins
 * and the strip travels sideways as you scroll; on phones it is a native
 * swipe carousel.
 */
export function Gallery() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const pinned = !reducedMotion && !isMobile;

  useEffect(() => {
    if (!pinned || !rootRef.current || !trackRef.current) return;
    const track = trackRef.current;
    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 0.5,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
      // each photo drifts slightly inside its frame for depth
      track.querySelectorAll<HTMLElement>("[data-parallax]").forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -6 },
          {
            xPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: rootRef.current, start: "top top", end: () => `+=${distance()}`, scrub: 0.5 },
          },
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, [pinned]);

  return (
    <section ref={rootRef} id="mehr" className={`${styles.section} ${pinned ? styles.pinned : styles.swipe}`}>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.intro}>
          <p className="label">Am Tisch</p>
          <h2 className={styles.title}>Mehr als Fleisch.</h2>
          <p className={styles.lead}>
            Zum Rodízio gehört ein reichhaltiges Buffet mit brasilianischen Beilagen, Salaten und warmen Spezialitäten –
            und zum Schluss etwas Süsses.
          </p>
          {pinned && <p className={styles.hint}>Weiter scrollen →</p>}
        </div>
        {ITEMS.map((it, i) => (
          <figure key={it.src} className={styles.card} style={{ marginTop: pinned ? `${(i % 3) * 4}vh` : undefined }}>
            <div className={styles.frame}>
              <img src={it.src} alt={it.title} data-parallax loading="lazy" />
            </div>
            <figcaption>
              <span className={styles.cardTitle}>{it.title}</span>
              <span className={styles.cardNote}>{it.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
