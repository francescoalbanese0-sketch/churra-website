import { PinnedSequence } from "../components/PinnedSequence";

const PHASES = [
  {
    label: "Spiess",
    note: "Fleisch, Metall, Feuer — bereit für Stunden am Kohlebett.",
    image: "/atmosphere/ritual-zeit.jpg",
    alt: "Picanha am Spiess über glühender Kohle",
  },
  {
    label: "Feuer",
    note: "Die Glut entscheidet über das Ergebnis, nicht die Uhr.",
    image: "/atmosphere/ritual-feuer.jpg",
    alt: "Offene Flamme und Glut in der Churrasqueira",
  },
  {
    label: "Fleisch",
    note: "Kruste aussen, saftig innen — der Moment, der zählt.",
    image: "/atmosphere/ritual-fleisch.jpg",
    alt: "Angeschnittene Picanha in Nahaufnahme",
  },
  {
    label: "Tranchieren",
    note: "Der erste Schnitt, direkt am Tisch.",
    image: "/atmosphere/experience-carving.jpg",
    alt: "Messer schneidet eine Scheibe von der Picanha ab",
  },
  {
    label: "Servieren",
    note: "Vom Feuer auf den Teller — ohne Umwege.",
    image: "/atmosphere/christmas-table.jpg",
    alt: "Gedeckter Tisch mit Picanha am Spiess im Hintergrund",
  },
];

// Fire peaks early (Spiess meeting the coals), holds through the meat, then
// tapers away through Tranchieren and Servieren — by the time the plate
// reaches the table, the fire has been left behind at the grill.
const HEAT = [0.5, 1, 0.6, 0.35, 0.15];

/** Makes the visitor feel the food rather than read about it: one scene that
 * physically transforms — skewer to fire to meat to knife to plate — rather
 * than five images stacked on a page. */
export function Experience() {
  return (
    <PinnedSequence
      id="das-erlebnis-feuer"
      eyebrow="Das Churrasco-Erlebnis"
      phases={PHASES}
      ember
      heat={HEAT}
    />
  );
}
