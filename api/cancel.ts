import { configured, db, json, mailGuestCancelled, mailRestaurant } from "./_lib.js";

/**
 * Guest self-service via the link in the confirmation e-mail.
 * GET  /api/cancel?id=…&t=…  → reservation summary
 * POST /api/cancel {id, t}   → cancels it
 */
async function load(id: string, t: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{20,64}$/i.test(t)) return null;
  const r = await db.reservation(id);
  return r && r.cancel_token === t ? r : null;
}

const pub = (r: NonNullable<Awaited<ReturnType<typeof load>>>) => ({
  date: r.date,
  time: r.time,
  adults: r.adults,
  children: r.children,
  menu: r.menu,
  service: r.service,
  name: r.name,
  status: r.status,
});

export async function GET(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const u = new URL(req.url);
  try {
    const r = await load(u.searchParams.get("id") ?? "", u.searchParams.get("t") ?? "");
    return r ? json({ reservation: pub(r) }) : json({ error: "Reservierung nicht gefunden." }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  try {
    const { id, t } = (await req.json()) as { id?: string; t?: string };
    const r = await load(id ?? "", t ?? "");
    if (!r) return json({ error: "Reservierung nicht gefunden." }, 404);
    if (r.status === "cancelled") return json({ ok: true, reservation: pub(r) });
    const updated = await db.updateReservation(r.id, { status: "cancelled" });
    if (updated) await Promise.all([mailGuestCancelled(updated), mailRestaurant(updated, "storniert")]);
    return json({ ok: true, reservation: pub(updated ?? r) });
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}
