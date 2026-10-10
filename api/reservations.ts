import { dateBookable, serviceAt, timeBookable, validateReservation, type ReservationInput } from "../shared/booking.js";
import { configured, db, json, mailGuestConfirmation, mailRestaurant } from "./_lib.js";

/** POST /api/reservations — a guest books a table online. */
export async function POST(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "Die Online-Reservierung ist noch nicht aktiv. Bitte rufen Sie uns an." }, 503);
  let body: Partial<ReservationInput> & { website?: string };
  try {
    body = (await req.json()) as Partial<ReservationInput> & { website?: string };
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  // Honeypot: real visitors never fill this hidden field.
  if (body.website) return json({ ok: true });

  const input = {
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    adults: Number(body.adults),
    children: Number(body.children ?? 0),
    menu: body.menu,
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    notes: String(body.notes ?? "").trim(),
  } as ReservationInput;

  const service = serviceAt(input.date, input.time);
  if (service && !service.menuChoice) input.menu = "buffet";
  const invalid = validateReservation(input, { online: true });
  if (invalid) return json({ error: invalid }, 400);
  if (!service || !dateBookable(input.date) || !timeBookable(input.date, input.time))
    return json({ error: "Diese Zeit kann online nicht mehr reserviert werden. Bitte wählen Sie eine andere." }, 409);

  try {
    const r = await db.create({ ...input, service: service.id, source: "online" }, true);
    if (!r.ok || !r.reservation) {
      const msg =
        r.error === "closed"
          ? "An diesem Tag sind wir leider geschlossen."
          : `Für diese Zeit ist leider kein Tisch mehr frei${r.remaining ? ` (noch ${r.remaining} Plätze)` : ""}. Bitte wählen Sie eine andere Zeit oder rufen Sie uns an.`;
      return json({ error: msg }, 409);
    }
    await Promise.all([
      mailGuestConfirmation(r.reservation),
      mailRestaurant(r.reservation, "neu"),
      db.purgeOld().catch((e) => console.error("purge", e)),
    ]);
    const { cancel_token: _t, ...publicRow } = r.reservation;
    return json({ ok: true, reservation: publicRow });
  } catch (e) {
    console.error(e);
    return json({ error: "Technischer Fehler. Bitte versuchen Sie es erneut oder rufen Sie uns an." }, 500);
  }
}
