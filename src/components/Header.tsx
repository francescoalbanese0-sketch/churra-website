import { useEffect, useState } from "react";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { label: "Das Konzept", href: "#konzept" },
  { label: "Das Erlebnis", href: "#erlebnis" },
  { label: "Firmen & Gruppen", href: "#firmen" },
  { label: "Kontakt", href: "#kontakt" },
];

/** Slim, discreet brand header — the real CHURRA mark plus a minimal nav. Never competes with the hero. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <a href="#hero" className={styles.brand} aria-label="Churra Churrascaría — Startseite">
        <img src="/brand/churra-logo.png" alt="Churra — Churrascaría Brazilian Steakhouse" className={styles.logo} />
      </a>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <a key={item.href} href={item.href} className={styles.navLink}>
            {item.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className={`${styles.toggle} ${menuOpen ? styles.toggleOpen : ""}`}
        aria-label={menuOpen ? "Menü schliessen" : "Menü öffnen"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span />
        <span />
      </button>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        {NAV_ITEMS.map((item) => (
          <a key={item.href} href={item.href} className={styles.mobileNavLink} onClick={handleNavClick}>
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}
