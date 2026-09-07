import { PinnedSequence } from "../components/PinnedSequence";

const PHASES = [
  {
    label: "Feuer",
    note: "Echte Glut. Kein Gas, keine Abkürzung.",
    image: "/atmosphere/ritual-feuer.jpg",
    alt: "Glühende Kohle und offene Flamme in der Churrasqueira",
  },
  {
    label: "Zeit",
    note: "Stunden am Feuer — nichts wird gehetzt.",
    image: "/atmosphere/ritual-zeit.jpg",
    alt: "Picanha am Spiess über glühender Kohle",
  },
  {
    label: "Fleisch",
    note: "Ausgewählt, gewürzt, mit Ruhe veredelt.",
    image: "/atmosphere/ritual-fleisch.jpg",
    alt: "Angeschnittene, perfekt gegarte Picanha in Nahaufnahme",
  },
];

// Fire is the constant; time is the pause between beats; the meat is the
// destination — this is where the fire the hero left behind becomes visible
// again and the ritual actually begins, so it runs hottest on "Feuer" and
// calms for "Zeit" before settling on the meat itself.
const HEAT = [1, 0.25, 0.55];

/**
 * The visitor's entry into the ritual itself. The eyebrow and opening line
 * that used to be their own quiet full-viewport block now live inside the
 * pin's first breath instead — one continuous entry into fire → time →
 * meat rather than "text section, then image section".
 */
export function Ritual() {
  return (
    <PinnedSequence
      id="erlebnis"
      eyebrow="02 — Das Ritual"
      introLine="Churrasco ist kein Gericht. Es ist ein Ritual."
      phases={PHASES}
      ember
      heat={HEAT}
    />
  );
}
