/**
 * Booking rules shared by the website (src/) and the reservation API (api/).
 * Pure TypeScript, no dependencies — safe to import from both sides.
 * Change opening hours, prices or limits here; everything else follows.
 */

export type ServiceId = "lunch" | "dinner";
export type MenuChoice = "rodizio" | "buffet";
export type Status = "confirmed" | "cancelled" | "no_show" | "arrived";

export interface ServiceWindow {
  id: ServiceId;
  label: string;
  open: string; // first bookable arrival, HH:MM
  lastArrival: string; // last bookable arrival, HH:MM
  /** true when guests choose between Rodízio and buffet; false = buffet only */
  menuChoice: boolean;
}

/** First day reservations are accepted (opening day). */
export const OPENING_DATE = "2026-10-23";
/** How far ahead guests can book online. */
export const MAX_DAYS_AHEAD = 90;
/** Minimum lead time for an online booking, in minutes. */
export const MIN_LEAD_MINUTES = 120;
/** Largest party bookable online; bigger groups are asked to call. */
export const MAX_PARTY_ONLINE = 12;
/** Slot interval in minutes. */
export const SLOT_MINUTES = 15;
/** Default number of guests per service when nothing is set in the agenda. */
export const DEFAULT_CAPACITY: Record<ServiceId, number> = { lunch: 60, dinner: 60 };

/**
 * Bookable arrival windows per weekday (0 = Sunday … 6 = Saturday).
 * Derived from the opening hours; last arrival leaves time for the meal
 * (lunch ≈ 45 min before closing, dinner ≈ 90 min before closing).
 */
export const WEEK: Record<number, ServiceWindow[]> = {
  0: [
    { id: "lunch", label: "Mittag", open: "12:00", lastArrival: "13:30", menuChoice: true },
    { id: "dinner", label: "Abend", open: "17:00", lastArrival: "20:00", menuChoice: true },
  ],
  1: [{ id: "lunch", label: "Mittag", open: "11:30", lastArrival: "13:00", menuChoice: false }],
  2: [
    { id: "lunch", label: "Mittag", open: "11:30", lastArrival: "13:00", menuChoice: false },
    { id: "dinner", label: "Abend", open: "18:00", lastArrival: "21:00", menuChoice: true },
  ],
  3: [
    { id: "lunch", label: "Mittag", open: "11:30", lastArrival: "13:00", menuChoice: false },
    { id: "dinner", label: "Abend", open: "18:00", lastArrival: "21:00", menuChoice: true },
  ],
  4: [
    { id: "lunch", label: "Mittag", open: "11:30", lastArrival: "13:00", menuChoice: false },
    { id: "dinner", label: "Abend", open: "18:00", lastArrival: "21:00", menuChoice: true },
  ],
  5: [
    { id: "lunch", label: "Mittag", open: "11:30", lastArrival: "13:00", menuChoice: false },
    { id: "dinner", label: "Abend", open: "18:00", lastArrival: "21:30", menuChoice: true },
  ],
  6: [{ id: "dinner", label: "Abend", open: "18:00", lastArrival: "21:30", menuChoice: true }],
};

export const PRICES = {
  lunchBuffet: "CHF 23.–",
  rodizioAdult: "CHF 69.–",
  rodizioChild: "CHF 35.–",
  dinnerBuffet: "CHF 35.–",
};

export const MENU_LABEL: Record<MenuChoice, string> = {
  rodizio: "Rodízio",
  buffet: "Nur Buffet",
};

export const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Bestätigt",
  cancelled: "Storniert",
  no_show: "Nicht erschienen",
  arrived: "Erschienen",
};

// ---------- date helpers (dates are plain "YYYY-MM-DD" strings in Swiss local time)

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Current date and minutes-since-midnight in Europe/Zurich. */
export function zurichNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function servicesFor(date: string): ServiceWindow[] {
  return WEEK[weekdayOf(date)] ?? [];
}

export function slotsFor(service: ServiceWindow): string[] {
  const out: string[] = [];
  for (let t = toMinutes(service.open); t <= toMinutes(service.lastArrival); t += SLOT_MINUTES) out.push(toHHMM(t));
  return out;
}

/** Which service a given arrival time belongs to on that date (or null if not bookable). */
export function serviceAt(date: string, time: string): ServiceWindow | null {
  return servicesFor(date).find((s) => slotsFor(s).includes(time)) ?? null;
}

/** Is the date inside the online booking window? (ignores closures and capacity) */
export function dateBookable(date: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = zurichNow(now).date;
  if (date < OPENING_DATE) return false;
  if (date < today) return false;
  if (date > addDays(today, MAX_DAYS_AHEAD)) return false;
  return servicesFor(date).length > 0;
}

/** Is this arrival time still far enough in the future? */
export function timeBookable(date: string, time: string, now: Date = new Date()): boolean {
  const z = zurichNow(now);
  if (date > z.date) return true;
  if (date < z.date) return false;
  return toMinutes(time) - z.minutes >= MIN_LEAD_MINUTES;
}

export function formatGuests(adults: number, children: number): string {
  const a = adults === 1 ? "1 Erwachsene Person" : `${adults} Erwachsene`;
  return children ? `${a} · ${children} ${children === 1 ? "Kind" : "Kinder"}` : a;
}

export function formatDateDE(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// ---------- validation shared by form and API

export interface ReservationInput {
  date: string;
  time: string;
  adults: number;
  children: number;
  menu: MenuChoice;
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export function validateReservation(r: Partial<ReservationInput>, opts: { online: boolean }): string | null {
  if (!r.date || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return "Bitte wählen Sie ein Datum.";
  if (!r.time || !/^\d{2}:\d{2}$/.test(r.time)) return "Bitte wählen Sie eine Uhrzeit.";
  const adults = Number(r.adults);
  const children = Number(r.children ?? 0);
  if (!Number.isInteger(adults) || adults < 1) return "Mindestens eine erwachsene Person.";
  if (!Number.isInteger(children) || children < 0) return "Ungültige Anzahl Kinder.";
  if (opts.online && adults + children > MAX_PARTY_ONLINE)
    return `Für Gruppen ab ${MAX_PARTY_ONLINE + 1} Personen rufen Sie uns bitte an.`;
  if (adults + children > 200) return "Ungültige Personenzahl.";
  if (r.menu !== "rodizio" && r.menu !== "buffet") return "Bitte wählen Sie Rodízio oder Buffet.";
  if (!r.name || r.name.trim().length < 2 || r.name.length > 120) return "Bitte geben Sie Ihren Namen an.";
  if (opts.online && (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || r.email.length > 200))
    return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  if (opts.online && (!r.phone || r.phone.replace(/[^\d+]/g, "").length < 7 || r.phone.length > 40))
    return "Bitte geben Sie eine gültige Telefonnummer an.";
  if (r.notes && r.notes.length > 1000) return "Die Anmerkung ist zu lang.";
  return null;
}
