import { VOUCHER_MAX, VOUCHER_MIN, normalizeCode, formatCode } from "../shared/voucher.js";
import { configured, isAdmin, json } from "./_lib.js";
import { expiryFrom, mailVoucherTo, vouchers, voucherLink, type Voucher } from "./_voucher.js";

/**
 * Gutscheine in the agenda — header `x-admin-key: <ADMIN_PASSWORD>`.
 * GET  ?q=…                                  list / search (code, name, e-mail)
 * POST {action:"redeem", id, amount, note?}  deduct an amount at the till
 * POST {action:"create", amount, buyerName, recipientName?, email?, message?}  sold at the counter (cash/card terminal)
 * POST {action:"cancel", id} | {action:"reactivate", id}
 * POST {action:"send", id, email}            send the voucher by e-mail
 */
const view = (v: Voucher) => ({ ...v, amount: Number(v.amount), balance: Number(v.balance), link: voucherLink(v) });

export async function GET(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    // a full code typed at the till: exact match first
    const code = normalizeCode(q);
    if (code.length === 8) {
      const v = await vouchers.byCode(formatCode(code));
      if (v) return json({ vouchers: [view(v)] });
    }
    return json({ vouchers: (await vouchers.list(q)).map(view) });
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
      case "redeem": {
        const v = await vouchers.byId(String(b.id));
        if (!v) return json({ error: "Gutschein nicht gefunden." }, 404);
        if (v.status !== "active") return json({ error: "Dieser Gutschein ist nicht mehr gültig." }, 409);
        const today = new Date().toISOString().slice(0, 10);
        if (v.expires_at < today && !b.ignoreExpiry) return json({ error: "Dieser Gutschein ist abgelaufen.", code: "expired" }, 409);
        const amount = Math.round(Number(b.amount) * 100) / 100;
        const balance = Number(v.balance);
        if (!(amount > 0)) return json({ error: "Bitte einen Betrag eingeben." }, 400);
        if (amount > balance + 0.001) return json({ error: `Restguthaben ist nur CHF ${balance.toFixed(2)}.` }, 409);
        const rest = Math.round((balance - amount) * 100) / 100;
        const history = [...(v.history ?? []), { at: new Date().toISOString(), amount, note: String(b.note ?? "").slice(0, 120) || undefined }];
        const r = await vouchers.patch(v.id, { balance: rest, history, status: rest <= 0 ? "redeemed" : "active" }, balance);
        if (!r) return json({ error: "Gutschein wurde gerade geändert – bitte neu laden." }, 409);
        return json({ ok: true, voucher: view(r) });
      }

      case "create": {
        const amount = Math.round(Number(b.amount) * 100) / 100;
        if (!(amount >= VOUCHER_MIN / 2) || amount > VOUCHER_MAX * 5) return json({ error: "Betrag prüfen." }, 400);
        const buyer = String(b.buyerName ?? "").trim().slice(0, 80);
        if (!buyer) return json({ error: "Bitte einen Namen eingeben." }, 400);
        const v = await vouchers.insert({
          amount,
          balance: amount,
          buyer_name: buyer,
          buyer_email: String(b.email ?? "").trim() || null,
          recipient_name: String(b.recipientName ?? "").trim().slice(0, 80) || null,
          message: String(b.message ?? "").trim().slice(0, 240) || null,
          expires_at: expiryFrom(),
          source: "kasse",
        });
        if (!v) return json({ error: "server" }, 500);
        if (v.buyer_email) await mailVoucherTo(v, v.buyer_email);
        return json({ ok: true, voucher: view(v) });
      }

      case "cancel":
      case "reactivate": {
        const v = await vouchers.byId(String(b.id));
        if (!v) return json({ error: "Gutschein nicht gefunden." }, 404);
        const status = b.action === "cancel" ? "cancelled" : Number(v.balance) > 0 ? "active" : "redeemed";
        const r = await vouchers.patch(v.id, { status });
        return json({ ok: true, voucher: r && view(r) });
      }

      case "send": {
        const v = await vouchers.byId(String(b.id));
        const to = String(b.email ?? "").trim();
        if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return json({ error: "E-Mail prüfen." }, 400);
        await mailVoucherTo(v, to);
        return json({ ok: true });
      }

      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}
