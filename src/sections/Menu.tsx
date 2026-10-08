import { useRef } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import styles from "./Menu.module.css";

const PRICES = [
  { label: "Erwachsene", price: "CHF 69.–" },
  { label: "Kinder", price: "CHF 35.–" },
  { label: "Nur Buffet", price: "CHF 35.–" },
];

const INCLUDED = ["Alle Fleischsorten des Rodízio", "Vollständiges Beilagenbuffet", "Pão de queijo", "Salatbuffet"];

const CUTS: { title: string; items: { name: string; note: string }[] }[] = [
  {
    title: "Rind",
    items: [
      { name: "Picanha", note: "Brasilianischer Rindfleisch-Klassiker" },
      { name: "Scamone (Rumpsteak)", note: "Zarter Rindfleisch-Cut" },
      { name: "Bavetta (Flank Steak)", note: "Aromatisches Rindfleisch aus der Bauchpartie" },
      { name: "Entrecote", note: "Saftiges Rindfleisch mit feiner Marmorierung" },
    ],
  },
  {
    title: "Schwein",
    items: [
      { name: "Salsiccia", note: "Italienische/Brasilianische Bratwurst" },
      { name: "Schweinebauch", note: "Zarter Schweinebauch mit knuspriger Kruste" },
    ],
  },
  {
    title: "Huhn",
    items: [
      { name: "Hähnchenschenkel", note: "Saftige Hähnchenschenkel" },
      { name: "Hähnchenherzen", note: "Brasilianische Spezialität" },
      { name: "Hähnchenflügel", note: "Marinierte Hähnchenflügel" },
      { name: "Truthahn mit Pancetta", note: "Saftiger Truthahn im Speckmantel" },
    ],
  },
  {
    title: "Weitere Spezialitäten",
    items: [
      { name: "Spinacino", note: "Zartes Rindfleisch aus dem Schulterbereich" },
      { name: "Picanha mit Trüffel & Knoblauch", note: "Picanha in feiner Trüffel-Knoblauch-Marinade" },
    ],
  },
  {
    title: "Beilagen vom Spiess",
    items: [{ name: "Ananas", note: "Gegrillte Ananas mit Zimt" }],
  },
];

/** Rodízio prices and the meats that come to the table — the same content as the printed menu. */
export function Menu() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const pricesRef = useRef<HTMLDivElement>(null);
  const cutsRef = useRef<HTMLDivElement>(null);
  const dessertRef = useRef<HTMLDivElement>(null);

  useScrollReveal(rootRef, [headRef, pricesRef, cutsRef, dessertRef], { start: "top 75%", stagger: 0.15 });

  return (
    <section ref={rootRef} id="speisekarte" className={styles.section}>
      <div ref={headRef} className={styles.head}>
        <p className={`label ${styles.eyebrow}`}>03 — Speisekarte</p>
        <h2 className={styles.title}>Rodízio</h2>
        <p className={styles.subtitle}>Brasilianische Fleischspezialitäten, direkt am Tisch tranchiert — so viel Sie möchten.</p>
      </div>

      <div ref={pricesRef} className={styles.prices}>
        {PRICES.map((p) => (
          <div key={p.label} className={styles.priceRow}>
            <span className={styles.priceLabel}>{p.label}</span>
            <span className={styles.priceDots} aria-hidden="true" />
            <span className={styles.priceValue}>{p.price}</span>
          </div>
        ))}
        <p className={styles.included}>
          Inbegriffen: {INCLUDED.join(" · ")}
          <br />
          Getränke sind nicht im Rodízio inbegriffen.
        </p>
      </div>

      <div ref={cutsRef} className={styles.cuts}>
        {CUTS.map((group) => (
          <div key={group.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <li key={item.name}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemNote}>{item.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div ref={dessertRef} className={styles.dessert}>
        <h3 className={styles.groupTitle}>Unsere Dessert-Auswahl</h3>
        <p className={styles.itemNote}>Drei wechselnde Dessert-Kreationen, sorgfältig für Sie ausgewählt.</p>
        <p className={styles.dessertPrice}>CHF 14.50 / Dessert</p>
        <p className={styles.small}>
          Bitte informieren Sie unser Team über Lebensmittelallergien oder Unverträglichkeiten.
        </p>
      </div>
    </section>
  );
}
