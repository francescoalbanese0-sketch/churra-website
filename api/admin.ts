import { addDays, serviceAt, validateReservation, type ReservationInput, type ServiceId, type Status } from "../shared/booking.js";
import { configured, db, isAdmin, json, mailGuestCancelled, mailGuestConfirmation, usage } from "./_lib.js";

/**
 * Agenda API — every call needs the header `x-admin-key: <ADMIN_PASSWORD>`.
 * GET  ?action=day&date=YYYY-MM-DD
 * GET  ?action=range&from=…&to=…        (summary per day and service)
 * POST {action:"login"}
 * POST {action:"create", …reservation, sendMail?, ignoreCapacity?}
 * POST {action:"status", id, status, notify?}
 * POST {action:"update", id, fields:{…}}
 * POST {action:"capacity", lunch, dinner}
 * POST {action:"close", date, reason} | {action:"reopen", date}
 */
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
  const u = new URL(req.url);
  const action = u.searchParams.get("action");
  try {
    if (action === "day") {
      const date = u.searchParams.get("date");
      if (!isDate(date)) return json({ error: "date" }, 400);
      const [rows, closures, cap] = await Promise.all([
        db.reservationsBetween(date, date),
        db.closuresBetween(date, date),
        db.capacity(),
      ]);
      return json({ date, reservations: rows, closure: closures[0] ?? null, capacity: cap });
    }
    if (action === "range") {
      const from = u.searchParams.get("from");
      const to = u.searchParams.get("to");
      if (!isDate(from) || !isDate(to) || to < from || to > addDays(from, 120)) return json({ error: "range" }, 400);
      const [rows, closures, cap] = await Promise.all([
        db.reservationsBetween(from, to, "date,service,adults,children,status"),
        db.closuresBetween(from, to),
        db.capacity(),
      ]);
      const used = usage(rows);
      const count = new Map<string, number>();
      for (const r of rows) if (r.status === "confirmed" || r.status === "arrived") count.set(r.date, (count.get(r.date) ?? 0) + 1);
      const days = [];
      for (let d = from; d <= to; d = addDays(d, 1)) {
        const c = closures.find((x) => x.date === d);
        days.push({
          date: d,
          lunch: used.get(`${d}|lunch`) ?? 0,
          dinner: used.get(`${d}|dinner`) ?? 0,
          bookings: count.get(d) ?? 0,
          closed: c ? (c.reason ?? "") : null,
        });
      }
      return json({ days, capacity: cap });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "body" }, 400);
  }
  try {
    switch (b.action) {
      case "login":
        return json({ ok: true });

      case "create": {
        const input = {
          date: String(b.date ?? ""),
          time: String(b.time ?? ""),
          adults: Number(b.adults),
          children: Number(b.children ?? 0),
          menu: b.menu,
          name: String(b.name ?? "").trim(),
          email: String(b.email ?? "").trim(),
          phone: String(b.phone ?? "").trim(),
          notes: String(b.notes ?? "").trim(),
        } as ReservationInput;
        const win = serviceAt(input.date, input.time);
        const service = win?.id ?? (Number(input.time.slice(0, 2)) < 16 ? "lunch" : "dinner");
        if (win && !win.menuChoice) input.menu = "buffet";
        const invalid = validateReservation(input, { online: false });
        if (invalid) return json({ error: invalid }, 400);
        const r = await db.create({ ...input, service, source: "telefon" }, !b.ignoreCapacity);
        if (!r.ok || !r.reservation)
          return json(
            { error: r.error === "closed" ? "Tag ist geschlossen." : `Ausgebucht (noch ${r.remaining ?? 0} Plätze).`, code: r.error },
            409,
          );
        if (b.sendMail) await mailGuestConfirmation(r.reservation);
        return json({ ok: true, reservation: r.reservation });
      }

      case "status": {
        const status = b.status as Status;
        if (!["confirmed", "cancelled", "no_show", "arrived"].includes(status)) return json({ error: "status" }, 400);
        const r = await db.updateReservation(String(b.id), { status });
        if (r && status === "cancelled" && b.notify) await mailGuestCancelled(r);
        return json({ ok: true, reservation: r });
      }

      case "update": {
        const f = (b.fields ?? {}) as Record<string, unknown>;
        const allowed = ["date", "time", "adults", "children", "menu", "name", "email", "phone", "notes"];
        const patch: Record<string, unknown> = {};
        for (const k of allowed) if (k in f) patch[k] = f[k];
        if (patch.date || patch.time) {
          const cur = await db.reservation(String(b.id));
          if (!cur) return json({ error: "not_found" }, 404);
          const d = String(patch.date ?? cur.date);
          const t = String(patch.time ?? cur.time);
          patch.service = serviceAt(d, t)?.id ?? (Number(t.slice(0, 2)) < 16 ? "lunch" : "dinner");
        }
        const r = await db.updateReservation(String(b.id), patch);
        return json({ ok: true, reservation: r });
      }

      case "capacity": {
        const cap: Record<ServiceId, number> = {
          lunch: Math.max(0, Math.min(1000, Math.round(Number(b.lunch)))),
          dinner: Math.max(0, Math.min(1000, Math.round(Number(b.dinner)))),
        };
        if (Number.isNaN(cap.lunch) || Number.isNaN(cap.dinner)) return json({ error: "capacity" }, 400);
        await db.setCapacity(cap);
        return json({ ok: true, capacity: cap });
      }

      case "close":
        if (!isDate(b.date)) return json({ error: "date" }, 400);
        await db.addClosure(b.date, String(b.reason ?? "").slice(0, 200));
        return json({ ok: true });

      case "reopen":
        if (!isDate(b.date)) return json({ error: "date" }, 400);
        await db.removeClosure(b.date);
        return json({ ok: true });

      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}
