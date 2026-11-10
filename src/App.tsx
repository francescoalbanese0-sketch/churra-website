import { lazy, Suspense, useEffect, useState } from "react";
import { ScrollTrigger } from "./animations/gsap";
import { Loader } from "./components/Loader";
import { Grain } from "./components/Grain";
import { ScrollProgress } from "./components/ScrollProgress";
import { Header } from "./components/Header";
import { Corridor } from "./components/Corridor";
import { Hero } from "./sections/Hero";
import { Transformation } from "./sections/Transformation";
import { Ritual } from "./sections/Ritual";
import { Atmosphere } from "./sections/Atmosphere";
import { Experience } from "./sections/Experience";
import { Chef } from "./sections/Chef";
import { Gallery } from "./sections/Gallery";
import { Menu } from "./sections/Menu";
import { Reservation } from "./sections/Reservation";
import { Christmas } from "./sections/Christmas";
import { Location } from "./sections/Location";
import { Footer } from "./sections/Footer";
import { Groups } from "./sections/Groups";
import { Vouchers } from "./sections/Vouchers";
import styles from "./App.module.css";

// The one persistent Three.js layer the whole journey travels through —
// deferred so it never blocks first paint, same reasoning as EmberScene.
const CinematicWorld = lazy(() => import("./three/CinematicWorld"));

/**
 * Links like churra.ch/#gutscheine: the browser tries to jump before the page is
 * built (loader, pinned scroll scenes, lazy images), so it lands in the wrong place.
 * After the loader we jump ourselves and correct a few times while the layout settles.
 */
function jumpToHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return () => {};
  let tries = 0;
  let timer = 0;
  const go = () => {
    const el = document.getElementById(id);
    if (el) {
      ScrollTrigger.refresh();
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const top = el.getBoundingClientRect().top + window.scrollY - margin;
      if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    }
    if (++tries < 6) timer = window.setTimeout(go, 350);
  };
  go();
  // stop correcting as soon as the guest scrolls by themselves
  const stop = () => window.clearTimeout(timer);
  window.addEventListener("wheel", stop, { once: true, passive: true });
  window.addEventListener("touchstart", stop, { once: true, passive: true });
  return () => {
    stop();
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
  };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if ("scrollRestoration" in history && window.location.hash) history.scrollRestoration = "manual";
  }, []);
  useEffect(() => (loaded ? jumpToHash() : undefined), [loaded]);

  return (
    <>
      <div className={styles.world} aria-hidden="true">
        <Suspense fallback={null}>
          <CinematicWorld />
        </Suspense>
      </div>
      <Loader onDone={() => setLoaded(true)} />
      <Grain />
      <ScrollProgress />
      <Header />
      <main>
        <Hero reveal={loaded} />
        {/* The camera leaves the fire and travels deeper into the kitchen —
            pure world, no photograph, bridging Hero's video into
            Transformation's charcoal/grill imagery. */}
        <Corridor word="Küche" />
        <Transformation />
        <Ritual />
        <Atmosphere />
        <Experience />
        <Chef />
        <Gallery />
        {/* The camera leaves the grill and arrives at the table — bridging
            the last "Servieren" plate into the dining-room commercial
            moment, the "I want to be there" turn the brief asks for. */}
        <Corridor word="Restaurant" />
        <Menu />
        <Reservation />
        <Christmas />
        <Groups />
        <Vouchers />
        <Location />
        <Footer />
      </main>
    </>
  );
}
