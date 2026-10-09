import { PinnedSequence } from "../components/PinnedSequence";

const PHASES = [
  {
    label: "Spiess",
    note: "Ganze Stücke, von Hand auf den Spiess gesteckt – bereit für die Glut.",
    image: "/photos/spiess.jpg",
    alt: "Picanha am Spiess über der Glut in unserer Churrasqueira",
    focus: "50% 55%",
  },
  {
    label: "Feuer",
    note: "Echte Holzkohle. Die Glut entscheidet über das Ergebnis, nicht die Uhr.",
    image: "/photos/feuer.jpg",
    alt: "Spiesse über glühender Holzkohle in der Churrasqueira",
    focus: "50% 62%",
  },
  {
    label: "Fleisch",
    note: "Kruste aussen, rosa innen – der Moment, in dem es perfekt ist.",
    image: "/photos/fleisch.jpg",
    alt: "Rosa gegarte Picanha am Spiess, eine Scheibe wird mit der Zange gehalten",
    focus: "60% 40%",
  },
  {
    label: "Tranchieren",
    note: "Der erste Schnitt, direkt vom Spiess.",
    image: "/photos/tranchieren.jpg",
    alt: "Das Messer schneidet eine Scheibe Picanha direkt vom Spiess",
    focus: "50% 45%",
  },
  {
    label: "Servieren",
    note: "Am Tisch, vor Ihren Augen – so oft Sie möchten.",
    image: "/photos/servieren.jpg",
    alt: "Chef Gianfranco schneidet das Fleisch am Tisch der Gäste",
    focus: "50% 30%",
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
