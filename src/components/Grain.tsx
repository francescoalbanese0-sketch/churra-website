import styles from "./Grain.module.css";

/** Fixed, full-viewport film-grain texture for a cinematic (non-digital-flat) surface. Purely decorative. */
export function Grain() {
  return <div className={styles.grain} aria-hidden="true" />;
}
