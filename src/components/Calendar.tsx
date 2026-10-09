import styles from "./Calendar.module.css";

export type DayState = "open" | "full" | "closed";

interface CalendarProps {
  month: string; // YYYY-MM
  days: Record<string, DayState> | null;
  selected: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (date: string) => void;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function Calendar({ month, days, selected, canPrev, canNext, onPrev, onNext, onSelect }: CalendarProps) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const title = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  return (
    <div className={styles.calendar}>
      <div className={styles.head}>
        <button type="button" className={styles.nav} onClick={onPrev} disabled={!canPrev} aria-label="Vorheriger Monat">
          ‹
        </button>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.nav} onClick={onNext} disabled={!canNext} aria-label="Nächster Monat">
          ›
        </button>
      </div>
      <div className={styles.grid} role="grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const state: DayState = days?.[d] ?? "closed";
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              className={`${styles.day} ${styles[state]} ${isSel ? styles.selected : ""}`}
              disabled={!days || state !== "open"}
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={`${Number(d.slice(8))}. ${title}${state === "full" ? " – ausgebucht" : ""}`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span>
          <i className={styles.dotOpen} /> verfügbar
        </span>
        <span>
          <i className={styles.dotFull} /> ausgebucht
        </span>
      </div>
    </div>
  );
}
