import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MENU_LABEL,
  STATUS_LABEL,
  addDays,
  formatDateDE,
  servicesFor,
  slotsFor,
  zurichNow,
  type MenuChoice,
  type ServiceId,
  type Status,
} from "../../shared/booking";
import styles from "./Admin.module.css";

interface Row {
  id: string;
  created_at: string;
  date: string;
  time: string;
  service: ServiceId;
  adults: number;
  children: number;
  menu: MenuChoice;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: Status;
  source: string;
}
interface DayData {
  reservations: Row[];
  closure: { date: string; reason: string | null } | null;
  capacity: Record<ServiceId, number>;
}
interface RangeDay {
  date: string;
  lunch: number;
  dinner: number;
  bookings: number;
  closed: string | null;
}

const KEY = "churra-admin-key";
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  set: (v: string) => {
    try {
      if (v) sessionStorage.setItem(KEY, v);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* private mode */
    }
  },
};

const SERVICE_LABEL: Record<ServiceId, string> = { lunch: "Mittag", dinner: "Abend" };
const shortDay = (d: string) =>
  new Intl.DateTimeFormat("de-CH", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );

export default function Admin() {
  const [key, setKey] = useState(store.get);
  const [authed, setAuthed] = useState(false);
  const [date, setDate] = useState(() => zurichNow().date);
  const [day, setDay] = useState<DayData | null>(null);
  const [week, setWeek] = useState<RangeDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.title = "Agenda – Churra";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
  }, []);

  const api = useCallback(
    async (method: "GET" | "POST", qs: string, body?: unknown) => {
      const r = await fetch(`/api/admin${qs}`, {
        method,
        headers: { "x-admin-key": key, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setAuthed(false);
        store.set("");
        throw new Error("Passwort falsch.");
      }
      if (r.status === 503) throw new Error("Die Datenbank ist noch nicht verbunden (Supabase-Variablen in Vercel fehlen).");
      if (!r.ok) throw new Error(d.error && d.error.length > 12 ? d.error : "Fehler beim Speichern.");
      return d;
    },
    [key],
  );

  const load = useCallback(async () => {
    try {
      const [d, w] = await Promise.all([
        api("GET", `?action=day&date=${date}`),
        api("GET", `?action=range&from=${date}&to=${addDays(date, 6)}`),
      ]);
      setDay(d);
      setWeek(w.days);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, date]);

  // try stored key once
  useEffect(() => {
    if (!key) return;
    api("POST", "", { action: "login" })
      .then(() => setAuthed(true))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authed) return;
    load();
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, [authed, load]);

  if (!authed) {
    return (
      <main className={styles.login}>
        <img src="/brand/churra-logo.png" alt="Churra" />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await api("POST", "", { action: "login" });
              store.set(key);
              setAuthed(true);
            } catch (er) {
              setError((er as Error).message);
            }
          }}
        >
          <h1>Agenda</h1>
          <label>
            Passwort
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.primary}>
            Anmelden
          </button>
        </form>
      </main>
    );
  }

  const act = async (body: Record<string, unknown>) => {
    try {
      await api("POST", "", body);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const setStatus = (r: Row, status: Status) => {
    if (status === "cancelled") {
      if (!window.confirm(`Reservierung von ${r.name} stornieren?`)) return;
      const notify = r.email ? window.confirm("Gast per E-Mail über die Stornierung informieren?") : false;
      act({ action: "status", id: r.id, status, notify });
    } else act({ action: "status", id: r.id, status });
  };

  const services: ServiceId[] = Array.from(
    new Set<ServiceId>([...servicesFor(date).map((s) => s.id), ...(day?.reservations.map((r) => r.service) ?? [])]),
  ).sort((a, b) => (a === b ? 0 : a === "lunch" ? -1 : 1));

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <img src="/brand/churra-logo.png" alt="Churra" className={styles.logo} />
        <div className={styles.dateNav}>
          <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Vortag">
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" onClick={() => setDate(addDays(date, 1))} aria-label="Folgetag">
            ›
          </button>
          <button type="button" className={styles.ghost} onClick={() => setDate(zurichNow().date)}>
            Heute
          </button>
        </div>
        <div className={styles.topActions}>
          <button type="button" className={styles.primary} onClick={() => setEdit({ date, adults: 2, children: 0, menu: "rodizio" })}>
            + Reservierung
          </button>
          <button type="button" className={styles.ghost} onClick={() => window.print()}>
            Drucken
          </button>
          <button type="button" className={styles.ghost} onClick={() => setShowSettings(true)}>
            Einstellungen
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              store.set("");
              setKey("");
              setAuthed(false);
            }}
          >
            Abmelden
          </button>
        </div>
      </header>

      <nav className={styles.week} aria-label="Woche">
        {week.map((w) => (
          <button
            key={w.date}
            type="button"
            className={`${styles.weekDay} ${w.date === date ? styles.weekOn : ""} ${w.closed !== null ? styles.weekClosed : ""}`}
            onClick={() => setDate(w.date)}
          >
            <span>{shortDay(w.date)}</span>
            {w.closed !== null ? (
              <small>geschlossen</small>
            ) : (
              <small>
                {w.lunch ? `M ${w.lunch}` : "M –"} · {w.dinner ? `A ${w.dinner}` : "A –"}
              </small>
            )}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        <div className={styles.dayHead}>
          <h1>{formatDateDE(date)}</h1>
          {day?.closure ? (
            <div className={styles.closed}>
              Geschlossen{day.closure.reason ? `: ${day.closure.reason}` : ""}
              <button type="button" className={styles.ghost} onClick={() => act({ action: "reopen", date })}>
                Wieder öffnen
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                const reason = window.prompt("Tag für Online-Reservierungen schliessen. Grund (optional):", "");
                if (reason !== null) act({ action: "close", date, reason });
              }}
            >
              Tag schliessen
            </button>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!day ? (
          <p className={styles.muted}>Laden …</p>
        ) : services.length === 0 ? (
          <p className={styles.muted}>An diesem Tag ist das Restaurant geschlossen.</p>
        ) : (
          services.map((sid) => (
            <ServiceBlock
              key={sid}
              id={sid}
              rows={day.reservations.filter((r) => r.service === sid)}
              capacity={day.capacity[sid]}
              onStatus={setStatus}
              onEdit={(r) => setEdit(r)}
            />
          ))
        )}
      </main>

      {edit && (
        <EditDialog
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (payload, isNew) => {
            try {
              if (isNew) await api("POST", "", { action: "create", ...payload });
              else await api("POST", "", { action: "update", id: edit.id, fields: payload });
              setEdit(null);
              if (payload.date && payload.date !== date) setDate(String(payload.date));
              else await load();
            } catch (e) {
              const msg = (e as Error).message;
              if (isNew && msg.startsWith("Ausgebucht") && window.confirm(`${msg}\nTrotzdem eintragen?`)) {
                await api("POST", "", { action: "create", ...payload, ignoreCapacity: true });
                setEdit(null);
                await load();
              } else alert(msg);
            }
          }}
        />
      )}

      {showSettings && day && (
        <Settings
          capacity={day.capacity}
          onClose={() => setShowSettings(false)}
          onSave={async (cap) => {
            await act({ action: "capacity", ...cap });
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

function ServiceBlock({
  id,
  rows,
  capacity,
  onStatus,
  onEdit,
}: {
  id: ServiceId;
  rows: Row[];
  capacity: number;
  onStatus: (r: Row, s: Status) => void;
  onEdit: (r: Row) => void;
}) {
  const active = rows.filter((r) => r.status === "confirmed" || r.status === "arrived");
  const guests = active.reduce((s, r) => s + r.adults + r.children, 0);
  const kids = active.reduce((s, r) => s + r.children, 0);
  const rodizio = active.filter((r) => r.menu === "rodizio").reduce((s, r) => s + r.adults + r.children, 0);
  const pct = capacity ? Math.min(100, Math.round((guests / capacity) * 100)) : 0;
  const sorted = useMemo(() => [...rows].sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name)), [rows]);

  return (
    <section className={styles.service}>
      <div className={styles.serviceHead}>
        <h2>{SERVICE_LABEL[id]}</h2>
        <div className={styles.stats}>
          <strong>{guests}</strong> / {capacity} Personen · {active.length} Tische
          {kids ? ` · ${kids} Kinder` : ""}
          {id === "dinner" || rodizio ? ` · Rodízio ${rodizio} · Buffet ${guests - rodizio}` : ""}
        </div>
        <div className={styles.bar}>
          <span style={{ width: `${pct}%` }} className={pct >= 90 ? styles.barFull : ""} />
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className={styles.muted}>Noch keine Reservierungen.</p>
      ) : (
        <div className={styles.table}>
          {sorted.map((r) => (
            <div key={r.id} className={`${styles.row} ${styles["st_" + r.status]}`}>
              <span className={styles.time}>{r.time}</span>
              <button type="button" className={styles.who} onClick={() => onEdit(r)} title="Bearbeiten">
                <strong>{r.name}</strong>
                <small>
                  {r.adults + r.children} Pers.{r.children ? ` (${r.children} K)` : ""} ·{" "}
                  <em className={r.menu === "rodizio" ? styles.rod : styles.buf}>
                    {r.service === "lunch" && r.menu === "buffet" ? "Mittagsbuffet" : MENU_LABEL[r.menu]}
                  </em>
                  {r.source !== "online" ? ` · ${r.source}` : ""}
                </small>
                {r.notes && <span className={styles.notes}>{r.notes}</span>}
              </button>
              <span className={styles.contact}>
                {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a>}
                {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
              </span>
              <span className={styles.status}>{STATUS_LABEL[r.status]}</span>
              <span className={styles.rowActions}>
                {r.status !== "arrived" && r.status !== "cancelled" && (
                  <button type="button" onClick={() => onStatus(r, "arrived")} title="Erschienen">
                    ✓ da
                  </button>
                )}
                {r.status === "confirmed" && (
                  <button type="button" onClick={() => onStatus(r, "no_show")} title="Nicht erschienen">
                    No-Show
                  </button>
                )}
                {r.status !== "cancelled" ? (
                  <button type="button" onClick={() => onStatus(r, "cancelled")} title="Stornieren">
                    ✕
                  </button>
                ) : (
                  <button type="button" onClick={() => onStatus(r, "confirmed")} title="Wiederherstellen">
                    ↺
                  </button>
                )}
                {(r.status === "arrived" || r.status === "no_show") && (
                  <button type="button" onClick={() => onStatus(r, "confirmed")} title="Zurücksetzen">
                    ↺
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<Row>;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, isNew: boolean) => Promise<void>;
}) {
  const isNew = !initial.id;
  const [f, setF] = useState({
    date: initial.date ?? zurichNow().date,
    time: initial.time ?? "",
    adults: initial.adults ?? 2,
    children: initial.children ?? 0,
    menu: (initial.menu ?? "rodizio") as MenuChoice,
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    notes: initial.notes ?? "",
    sendMail: false,
  });
  const [busy, setBusy] = useState(false);
  const slots = servicesFor(f.date).flatMap((s) => slotsFor(s));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.time || !f.name) return alert("Uhrzeit und Name sind nötig.");
          setBusy(true);
          const { sendMail, ...fields } = f;
          await onSave(isNew ? { ...fields, sendMail } : fields, isNew);
          setBusy(false);
        }}
      >
        <h2>{isNew ? "Neue Reservierung" : "Reservierung bearbeiten"}</h2>
        <div className={styles.grid}>
          <label>
            Datum
            <input type="date" value={f.date} onChange={set("date")} required />
          </label>
          <label>
            Uhrzeit
            <input list="slots" value={f.time} onChange={set("time")} placeholder="19:00" pattern="\d{2}:\d{2}" required />
            <datalist id="slots">
              {slots.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label>
            Erwachsene
            <input type="number" min={1} value={f.adults} onChange={set("adults")} />
          </label>
          <label>
            Kinder
            <input type="number" min={0} value={f.children} onChange={set("children")} />
          </label>
          <label className={styles.full}>
            Menü
            <select value={f.menu} onChange={set("menu")}>
              <option value="rodizio">Rodízio</option>
              <option value="buffet">Buffet (mittags: Mittagsbuffet)</option>
            </select>
          </label>
          <label className={styles.full}>
            Name
            <input value={f.name} onChange={set("name")} required />
          </label>
          <label>
            Telefon
            <input value={f.phone} onChange={set("phone")} />
          </label>
          <label>
            E-Mail
            <input type="email" value={f.email} onChange={set("email")} />
          </label>
          <label className={styles.full}>
            Notizen
            <textarea rows={2} value={f.notes} onChange={set("notes")} />
          </label>
          {isNew && (
            <label className={`${styles.full} ${styles.check}`}>
              <input type="checkbox" checked={f.sendMail} onChange={set("sendMail")} disabled={!f.email} />
              Bestätigung per E-Mail an den Gast senden
            </label>
          )}
        </div>
        <div className={styles.dialogActions}>
          <button type="submit" className={styles.primary} disabled={busy}>
            {busy ? "Speichern …" : "Speichern"}
          </button>
          <button type="button" className={styles.ghost} onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

function Settings({
  capacity,
  onClose,
  onSave,
}: {
  capacity: Record<ServiceId, number>;
  onClose: () => void;
  onSave: (c: Record<ServiceId, number>) => Promise<void>;
}) {
  const [cap, setCap] = useState(capacity);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(cap);
        }}
      >
        <h2>Einstellungen</h2>
        <p className={styles.muted}>
          Wie viele Gäste dürfen pro Service online reservieren? Telefonische Reservierungen können Sie auch darüber hinaus eintragen.
        </p>
        <div className={styles.grid}>
          <label>
            Plätze Mittag
            <input type="number" min={0} value={cap.lunch} onChange={(e) => setCap({ ...cap, lunch: Number(e.target.value) })} />
          </label>
          <label>
            Plätze Abend
            <input type="number" min={0} value={cap.dinner} onChange={(e) => setCap({ ...cap, dinner: Number(e.target.value) })} />
          </label>
        </div>
        <div className={styles.dialogActions}>
          <button type="submit" className={styles.primary}>
            Speichern
          </button>
          <button type="button" className={styles.ghost} onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
