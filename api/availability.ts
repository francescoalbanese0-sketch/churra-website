import {
  addDays,
  dateBookable,
  servicesFor,
  slotsFor,
  timeBookable,
  zurichNow,
  MAX_DAYS_AHEAD,
  OPENING_DATE,
} from "../shared/booking.js";
import { configured, db, json, usage } from "./_lib.js";

/**
 * GET /api/availability?month=YYYY-MM            → which days of the month can still be booked
 * GET /api/availability?date=YYYY-MM-DD&guests=N → bookable arrival times for that day
 */
export async function GET(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const url = new URL(req.url);
  const guests = Math.max(1, Math.min(200, Number(url.searchParams.get("guests") ?? 2) || 2));
  try {
    const cap = await db.capacity();
    const month = url.searchParams.get("month");
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const from = `${month}-01`;
      const to = addDays(addDays(from, 31).slice(0, 8) + "01", -1);
      const [rows, closures] = await Promise.all([
        db.reservationsBetween(from, to, "date,service,adults,children,status"),
        db.closuresBetween(from, to),
      ]);
      const used = usage(rows);
      const closed = new Set(closures.map((c) => c.date));
      const days: Record<string, "open" | "full" | "closed"> = {};
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (!dateBookable(d) || closed.has(d)) {
          days[d] = "closed";
          continue;
        }
        const anyRoom = servicesFor(d).some(
          (s) =>
            cap[s.id] - (used.get(`${d}|${s.id}`) ?? 0) >= guests && slotsFor(s).some((t) => timeBookable(d, t)),
        );
        days[d] = anyRoom ? "open" : "full";
      }
      const today = zurichNow().date;
      return json({ days, first: today > OPENING_DATE ? today : OPENING_DATE, last: addDays(today, MAX_DAYS_AHEAD) });
    }

    const date = url.searchParams.get("date") ?? "";
    if (!dateBookable(date)) return json({ date, closed: true, services: [] });
    const [rows, closures] = await Promise.all([
      db.reservationsBetween(date, date, "date,service,adults,children,status"),
      db.closuresBetween(date, date),
    ]);
    if (closures.length) return json({ date, closed: true, reason: closures[0].reason, services: [] });
    const used = usage(rows);
    const services = servicesFor(date).map((s) => {
      const remaining = Math.max(0, cap[s.id] - (used.get(`${date}|${s.id}`) ?? 0));
      return {
        id: s.id,
        label: s.label,
        menuChoice: s.menuChoice,
        remaining,
        slots: slotsFor(s).map((t) => ({ time: t, available: remaining >= guests && timeBookable(date, t) })),
      };
    });
    return json({ date, closed: false, services });
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}
