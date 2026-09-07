import { lazy, Suspense, useState } from "react";
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
import { Christmas } from "./sections/Christmas";
import { Location } from "./sections/Location";
import { Footer } from "./sections/Footer";
import styles from "./App.module.css";

// The one persistent Three.js layer the whole journey travels through —
// deferred so it never blocks first paint, same reasoning as EmberScene.
const CinematicWorld = lazy(() => import("./three/CinematicWorld"));

export default function App() {
  const [loaded, setLoaded] = useState(false);

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
        <Corridor word="Kitchen" />
        <Transformation />
        <Ritual />
        <Atmosphere />
        <Experience />
        {/* The camera leaves the grill and arrives at the table — bridging
            the last "Servieren" plate into the dining-room commercial
            moment, the "I want to be there" turn the brief asks for. */}
        <Corridor word="Restaurant" />
        <Christmas />
        <Location />
        <Footer />
      </main>
    </>
  );
}
