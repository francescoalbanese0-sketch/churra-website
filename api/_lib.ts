/**
 * Server helpers for the reservation API (Vercel Functions, Node runtime).
 * No npm dependencies: Supabase and Resend are called over plain HTTPS.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   SUPABASE_URL               https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service_role key (secret!)
 *   ADMIN_PASSWORD             password for www.churra.ch/admin
 *   RESEND_API_KEY             optional – enables e-mails
 *   MAIL_FROM                  optional – e.g. "Churra <reservierung@churra.ch>"
 *   RESTAURANT_EMAIL           optional – where new bookings are announced (default info@churra.ch)
 *   SITE_URL                   optional – default https://www.churra.ch
 */
import {
  DEFAULT_CAPACITY,
  MENU_LABEL,
  formatDateDE,
  formatGuests,
  type ServiceId,
} from "../shared/booking.js";

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined) ?? "";

export const SITE_URL = () => env("SITE_URL") || "https://www.churra.ch";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function configured(): boolean {
  return Boolean(env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
}

// ---------- Supabase REST

async function sb(path: string, init: RequestInit = {}): Promise<unknown> {
  const url = env("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path;
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export interface Row {
  id: string;
  created_at: string;
  date: string;
  time: string;
  service: ServiceId;
  adults: number;
  children: number;
  menu: "rodizio" | "buffet";
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "no_show" | "arrived";
  source: string;
  cancel_token: string;
}

const enc = encodeURIComponent;

export const db = {
  async reservationsBetween(from: string, to: string, fields = "*"): Promise<Row[]> {
    return (await sb(
      `reservations?select=${fields}&date=gte.${enc(from)}&date=lte.${enc(to)}&order=date.asc,time.asc`,
    )) as Row[];
  },
  async reservation(id: string): Promise<Row | null> {
    const rows = (await sb(`reservations?select=*&id=eq.${enc(id)}`)) as Row[];
    return rows[0] ?? null;
  },
  async updateReservation(id: string, patch: Partial<Row>): Promise<Row | null> {
    const rows = (await sb(`reservations?id=eq.${enc(id)}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(patch),
    })) as Row[];
    return rows[0] ?? null;
  },
  async create(p: Record<string, unknown>, checkCapacity: boolean): Promise<{ ok: boolean; error?: string; remaining?: number; reservation?: Row }> {
    return (await sb("rpc/create_reservation", {
      method: "POST",
      body: JSON.stringify({ p, check_capacity: checkCapacity }),
    })) as { ok: boolean; error?: string; remaining?: number; reservation?: Row };
  },
  async closuresBetween(from: string, to: string): Promise<{ date: string; reason: string | null }[]> {
    return (await sb(`closures?select=*&date=gte.${enc(from)}&date=lte.${enc(to)}&order=date.asc`)) as {
      date: string;
      reason: string | null;
    }[];
  },
  async addClosure(date: string, reason: string) {
    await sb("closures?on_conflict=date", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ date, reason }),
    });
  },
  async removeClosure(date: string) {
    await sb(`closures?date=eq.${enc(date)}`, { method: "DELETE" });
  },
  async capacity(): Promise<Record<ServiceId, number>> {
    const rows = (await sb("settings?select=value&key=eq.capacity")) as { value: Partial<Record<ServiceId, number>> }[];
    const v = rows[0]?.value ?? {};
    return {
      lunch: Number(v.lunch ?? DEFAULT_CAPACITY.lunch),
      dinner: Number(v.dinner ?? DEFAULT_CAPACITY.dinner),
    };
  },
  async setCapacity(cap: Record<ServiceId, number>) {
    await sb("settings?on_conflict=key", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key: "capacity", value: cap }),
    });
  },
};

/** Seats taken per date+service (confirmed and arrived count; cancelled/no-show free the table). */
export function usage(rows: Pick<Row, "date" | "service" | "adults" | "children" | "status">[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "confirmed" && r.status !== "arrived") continue;
    const k = `${r.date}|${r.service}`;
    m.set(k, (m.get(k) ?? 0) + r.adults + r.children);
  }
  return m;
}

// ---------- admin auth

export function isAdmin(req: Request): boolean {
  const expected = env("ADMIN_PASSWORD");
  const given = req.headers.get("x-admin-key") ?? "";
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ---------- e-mail (Resend)

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendMail(to: string, subject: string, html: string, replyTo?: string) {
  const key = env("RESEND_API_KEY");
  if (!key || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env("MAIL_FROM") || "Churra <reservierung@churra.ch>",
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) console.error("Resend", res.status, await res.text());
  } catch (e) {
    console.error("Resend failed", e);
  }
}

function frame(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#0a0806;font-family:Georgia,serif;color:#ede4d3">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0806"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #c9a15a;padding:0">
<tr><td style="padding:32px 32px 8px;text-align:center;letter-spacing:8px;font-size:26px;color:#f5af65">CHURRA</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center;letter-spacing:4px;font-size:11px;color:#c9a15a">CHURRASCARIA · BRAZILIAN</td></tr>
<tr><td style="padding:0 32px 32px;font-size:16px;line-height:1.6">${inner}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #3a2d1c;text-align:center;font-size:12px;color:#a89a84;font-family:Arial,sans-serif">
Churra · Theaterweg 7 · 7000 Chur · +41 81 250 02 21 · info@churra.ch</td></tr>
</table></td></tr></table></body></html>`;
}

function details(r: Row) {
  const people = formatGuests(r.adults, r.children);
  const rows: [string, string][] = [
    ["Datum", formatDateDE(r.date)],
    ["Uhrzeit", `${r.time} Uhr`],
    ["Personen", people],
    ["Menü", r.service === "lunch" && r.menu === "buffet" ? "Mittagsbuffet" : MENU_LABEL[r.menu]],
    ["Name", r.name],
  ];
  if (r.phone) rows.push(["Telefon", r.phone]);
  if (r.notes) rows.push(["Anmerkung", r.notes]);
  return `<table cellpadding="6" cellspacing="0" style="width:100%;margin:16px 0;font-size:15px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#c9a15a;width:110px;vertical-align:top">${k}</td><td>${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export async function mailGuestConfirmation(r: Row) {
  if (!r.email) return;
  const cancel = `${SITE_URL()}/stornieren?id=${r.id}&t=${r.cancel_token}`;
  await sendMail(
    r.email,
    `Ihre Reservierung bei Churra – ${formatDateDE(r.date)}, ${r.time} Uhr`,
    frame(`<p>Guten Tag ${esc(r.name)}</p>
<p>Vielen Dank für Ihre Reservierung. Wir freuen uns auf Ihren Besuch!</p>
${details(r)}
<p style="font-size:14px;color:#a89a84">Können Sie nicht kommen? Bitte stornieren Sie Ihren Tisch hier:<br>
<a href="${cancel}" style="color:#f5af65">Reservierung stornieren</a></p>`),
    env("RESTAURANT_EMAIL") || "info@churra.ch",
  );
}

export async function mailGuestCancelled(r: Row) {
  if (!r.email) return;
  await sendMail(
    r.email,
    `Ihre Reservierung bei Churra wurde storniert`,
    frame(`<p>Guten Tag ${esc(r.name)}</p><p>Ihre Reservierung wurde storniert.</p>${details(r)}
<p>Wir hoffen, Sie bald bei uns begrüssen zu dürfen.</p>`),
    env("RESTAURANT_EMAIL") || "info@churra.ch",
  );
}

export async function mailRestaurant(r: Row, kind: "neu" | "storniert") {
  const to = env("RESTAURANT_EMAIL") || "info@churra.ch";
  const subject =
    kind === "neu"
      ? `Neue Reservierung: ${formatDateDE(r.date)}, ${r.time} – ${r.adults + r.children} Pers. (${r.name})`
      : `Storniert: ${formatDateDE(r.date)}, ${r.time} – ${r.name}`;
  await sendMail(
    to,
    subject,
    frame(`${details(r)}${r.email ? `<p>E-Mail: ${esc(r.email)}</p>` : ""}
<p><a href="${SITE_URL()}/admin" style="color:#f5af65">Zur Agenda</a></p>`),
    r.email ?? undefined,
  );
}
