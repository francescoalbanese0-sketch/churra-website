import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, type DayState } from "../components/Calendar";
import {
  MAX_PARTY_ONLINE,
  MENU_LABEL,
  OPENING_DATE,
  PRICES,
  formatDateDE,
  formatGuests,
  validateReservation,
  zurichNow,
  type MenuChoice,
} from "../../shared/booking";
import { EMAIL, EMAIL_HREF, PHONE_DISPLAY, PHONE_HREF } from "../lib/info";
import styles from "./Reservation.module.css";

interface Slot {
  time: string;
  available: boolean;
}
interface ServiceAvail {
  id: "lunch" | "dinner";
  label: string;
  menuChoice: boolean;
  remaining: number;
  slots: Slot[];
}

const firstMonth = () => {
  const today = zurichNow().date;
  return (today > OPENING_DATE ? today : OPENING_DATE).slice(0, 7);
};
const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

type Step = 1 | 2 | 3 | 4;

export function Reservation() {
  const [step, setStep] = useState<Step>(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [month, setMonth] = useState(firstMonth);
  const [days, setDays] = useState<Record<string, DayState> | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceAvail[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuChoice | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [done, setDone] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const guests = adults + children;
  const service = useMemo(
    () => services?.find((s) => s.slots.some((sl) => sl.time === time)) ?? null,
    [services, time],
  );
  const lastMonth = shiftMonth(zurichNow().date.slice(0, 7), 3);

  // month availability
  useEffect(() => {
    let cancel = false;
    setDays(null);
    fetch(`/api/availability?month=${month}&guests=${guests}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => !cancel && setDays(d.days))
      .catch(() => !cancel && setOffline(true));
    return () => {
      cancel = true;
    };
  }, [month, guests]);

  // day slots
  useEffect(() => {
    if (!date) return;
    let cancel = false;
    setServices(null);
    fetch(`/api/availability?date=${date}&guests=${guests}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => !cancel && setServices(d.services ?? []))
      .catch(() => !cancel && setOffline(true));
    return () => {
      cancel = true;
    };
  }, [date, guests]);

  // a chosen time may become invalid when the party size changes
  useEffect(() => {
    if (time && services && !services.some((s) => s.slots.some((sl) => sl.time === time && sl.available))) setTime(null);
  }, [services, time]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const chooseTime = (t: string, svc: ServiceAvail) => {
    setTime(t);
    if (!svc.menuChoice) {
      setMenu("buffet");
      go(4);
    } else {
      setMenu(null);
      go(3);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !menu) return;
    const payload = { date, time, adults, children, menu, name, email, phone, notes, website };
    const invalid = validateReservation(payload, { online: true });
    if (invalid) return setError(invalid);
    if (!consent) return setError("Bitte bestätigen Sie die Speicherung Ihrer Angaben.");
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Die Reservierung konnte nicht gespeichert werden.");
        if (r.status === 409 && date) {
          // refresh the times so the guest sees what is still free
          setServices(null);
          fetch(`/api/availability?date=${date}&guests=${guests}`)
            .then((x) => x.json())
            .then((x) => setServices(x.services ?? []))
            .catch(() => {});
        }
        return;
      }
      setDone(true);
    } catch {
      setError("Keine Verbindung. Bitte versuchen Sie es erneut oder rufen Sie uns an.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDone(false);
    setStep(1);
    setDate(null);
    setTime(null);
    setMenu(null);
    setNotes("");
  };

  const menuText = menu
    ? service?.menuChoice === false
      ? `Mittagsbuffet · ${PRICES.lunchBuffet}`
      : MENU_LABEL[menu]
    : null;

  return (
    <section id="reservieren" className={styles.section}>
      <div className={styles.head}>
        <p className="label">Reservieren</p>
        <h2 className={styles.title}>Ihr Tisch am Feuer.</h2>
        <p className={styles.lead}>
          Wählen Sie Tag, Uhrzeit und Personenzahl – Sie erhalten sofort eine Bestätigung per E-Mail.
        </p>
      </div>

      <div className={styles.card}>
        {/* summary column */}
        <aside className={styles.summary} aria-label="Ihre Auswahl">
          <SummaryRow locked={done} label="Personen" value={formatGuests(adults, children)} active={step === 1} onEdit={() => go(1)} />
          <SummaryRow locked={done} label="Datum" value={date ? formatDateDE(date) : null} active={step === 1} onEdit={() => go(1)} />
          <SummaryRow locked={done} label="Uhrzeit" value={time ? `${time} Uhr` : null} active={step === 2} onEdit={date ? () => go(2) : undefined} />
          <SummaryRow locked={done}
            label="Menü"
            value={menuText}
            active={step === 3}
            onEdit={time && service?.menuChoice ? () => go(3) : undefined}
          />
          <div className={styles.contact}>
            <span>Grössere Gruppen & Anlässe</span>
            <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            <a href={EMAIL_HREF}>{EMAIL}</a>
          </div>
        </aside>

        <div ref={panelRef} className={styles.panel}>
          {offline ? (
            <div className={styles.message}>
              <h3>Reservierung per Telefon</h3>
              <p>Die Online-Reservierung ist im Moment nicht erreichbar. Wir nehmen Ihre Reservierung gerne telefonisch oder per E-Mail entgegen.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href={PHONE_HREF}>
                  {PHONE_DISPLAY}
                </a>
                <a className={styles.secondary} href={EMAIL_HREF}>
                  E-Mail schreiben
                </a>
              </div>
            </div>
          ) : done ? (
            <div className={styles.message}>
              <p className={styles.check} aria-hidden="true">
                ✓
              </p>
              <h3>Vielen Dank, {name.split(" ")[0]}!</h3>
              <p>
                Ihr Tisch ist reserviert: <strong>{date && formatDateDE(date)}</strong> um <strong>{time} Uhr</strong> für{" "}
                {guests} {guests === 1 ? "Person" : "Personen"}.
              </p>
              <p>Die Bestätigung ist unterwegs an {email}. Dort finden Sie auch einen Link, falls Sie stornieren müssen.</p>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={reset}>
                  Weitere Reservierung
                </button>
              </div>
            </div>
          ) : (
            <>
              <ol className={styles.steps} aria-label="Schritte">
                {["Tag", "Uhrzeit", "Menü", "Kontakt"].map((s, i) => (
                  <li key={s} className={step === i + 1 ? styles.stepOn : step > i + 1 ? styles.stepDone : ""}>
                    <span>{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>

              {step === 1 && (
                <div className={styles.stepBody}>
                  <div className={styles.counters}>
                    <Counter label="Erwachsene" value={adults} min={1} max={MAX_PARTY_ONLINE - children} onChange={setAdults} />
                    <Counter label="Kinder" value={children} min={0} max={MAX_PARTY_ONLINE - adults} onChange={setChildren} />
                  </div>
                  {guests >= MAX_PARTY_ONLINE && (
                    <p className={styles.note}>
                      Für mehr als {MAX_PARTY_ONLINE} Personen rufen Sie uns bitte an: <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
                    </p>
                  )}
                  <Calendar
                    month={month}
                    days={days}
                    selected={date}
                    canPrev={month > firstMonth()}
                    canNext={month < lastMonth}
                    onPrev={() => setMonth(shiftMonth(month, -1))}
                    onNext={() => setMonth(shiftMonth(month, 1))}
                    onSelect={(d) => {
                      setDate(d);
                      setTime(null);
                      setMenu(null);
                      go(2);
                    }}
                  />
                </div>
              )}

              {step === 2 && date && (
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>{formatDateDE(date)}</h3>
                  {!services ? (
                    <p className={styles.note}>Verfügbare Zeiten werden geladen …</p>
                  ) : services.length === 0 ? (
                    <p className={styles.note}>An diesem Tag ist leider keine Reservierung möglich.</p>
                  ) : (
                    services.map((s) => {
                      const any = s.slots.some((x) => x.available);
                      return (
                        <div key={s.id} className={styles.service}>
                          <div className={styles.serviceHead}>
                            <span>{s.label}</span>
                            <small>
                              {s.menuChoice ? `Rodízio oder Buffet` : `Mittagsbuffet ${PRICES.lunchBuffet}`}
                              {any && s.remaining < 12 ? ` · nur noch ${s.remaining} Plätze` : ""}
                            </small>
                          </div>
                          {any ? (
                            <div className={styles.slots}>
                              {s.slots.map((sl) => (
                                <button
                                  key={sl.time}
                                  type="button"
                                  disabled={!sl.available}
                                  className={`${styles.slot} ${time === sl.time ? styles.slotOn : ""}`}
                                  onClick={() => chooseTime(sl.time, s)}
                                >
                                  {sl.time}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.note}>Ausgebucht – bitte wählen Sie eine andere Zeit oder rufen Sie uns an.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                  <button type="button" className={styles.back} onClick={() => go(1)}>
                    ← anderer Tag
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>Was dürfen wir Ihnen servieren?</h3>
                  <div className={styles.menus}>
                    <button
                      type="button"
                      className={`${styles.menuCard} ${menu === "rodizio" ? styles.menuOn : ""}`}
                      onClick={() => {
                        setMenu("rodizio");
                        go(4);
                      }}
                    >
                      <span className={styles.menuName}>Rodízio</span>
                      <span className={styles.menuDesc}>Alle Fleischsorten vom Spiess, am Tisch tranchiert – inklusive Buffet.</span>
                      <span className={styles.menuPrice}>
                        {PRICES.rodizioAdult} <small>Erwachsene</small>
                      </span>
                      <span className={styles.menuPrice}>
                        {PRICES.rodizioChild} <small>Kinder</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.menuCard} ${menu === "buffet" ? styles.menuOn : ""}`}
                      onClick={() => {
                        setMenu("buffet");
                        go(4);
                      }}
                    >
                      <span className={styles.menuName}>Nur Buffet</span>
                      <span className={styles.menuDesc}>Brasilianische Beilagen, Salate und warme Spezialitäten – ohne Fleisch vom Spiess.</span>
                      <span className={styles.menuPrice}>
                        {PRICES.dinnerBuffet} <small>pro Person</small>
                      </span>
                    </button>
                  </div>
                  <p className={styles.note}>Gemischte Gruppen? Wählen Sie Rodízio und schreiben Sie uns die Aufteilung im nächsten Schritt.</p>
                  <button type="button" className={styles.back} onClick={() => go(2)}>
                    ← andere Uhrzeit
                  </button>
                </div>
              )}

              {step === 4 && (
                <form className={styles.stepBody} onSubmit={submit} noValidate>
                  <h3 className={styles.stepTitle}>Ihre Angaben</h3>
                  <div className={styles.fields}>
                    <label className={styles.full}>
                      <span>Vor- und Nachname</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                    </label>
                    <label>
                      <span>E-Mail</span>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                    </label>
                    <label>
                      <span>Telefon</span>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
                    </label>
                    <label className={styles.full}>
                      <span>Anmerkungen (optional)</span>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Allergien, Kinderstuhl, Anlass, Aufteilung Rodízio/Buffet …"
                      />
                    </label>
                    <label className={styles.hp} aria-hidden="true">
                      Website
                      <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </label>
                    <label className={`${styles.full} ${styles.consent}`}>
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Reservierung gespeichert werden.</span>
                    </label>
                  </div>
                  {error && (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button type="submit" className={styles.primary} disabled={busy}>
                      {busy ? "Wird gesendet …" : "Tisch verbindlich reservieren"}
                    </button>
                    <button type="button" className={styles.back} onClick={() => go(service?.menuChoice ? 3 : 2)}>
                      ← zurück
                    </button>
                  </div>
                </form>
              )}
              {error && step !== 4 && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  active,
  onEdit,
  locked,
}: {
  locked?: boolean;
  label: string;
  value: string | null;
  active: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className={`${styles.sumRow} ${active ? styles.sumActive : ""}`}>
      <span className={styles.sumLabel}>{label}</span>
      <span className={styles.sumValue}>{value ?? "—"}</span>
      {onEdit && value && !locked && (
        <button type="button" className={styles.sumEdit} onClick={onEdit}>
          ändern
        </button>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.counter}>
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} weniger`}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} mehr`}>
          +
        </button>
      </div>
    </div>
  );
}

