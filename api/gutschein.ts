import { validateVoucherOrder, type VoucherOrder } from "../shared/voucher.js";
import { configured, json } from "./_lib.js";
import { createCheckout, fulfill, publicVoucher, stripeConfigured, vouchers } from "./_voucher.js";

/**
 * POST {amount, buyerName, buyerEmail, recipientName?, message?}  → {url} (Stripe Checkout)
 * GET  ?session_id=cs_…   → after payment: creates the voucher if needed → {voucher, link}
 * GET  ?c=CODE&t=TOKEN    → the voucher page (print view)
 */
export async function POST(req: Request): Promise<Response> {
  if (!configured() || !stripeConfigured()) return json({ error: "Der Gutschein-Shop ist noch nicht aktiviert." }, 503);
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  if (String(b.website ?? "")) return json({ error: "Ungültige Anfrage." }, 400); // honeypot
  const order: VoucherOrder = {
    amount: Math.round(Number(b.amount)),
    buyerName: String(b.buyerName ?? "").trim().slice(0, 80),
    buyerEmail: String(b.buyerEmail ?? "").trim().slice(0, 120),
    recipientName: String(b.recipientName ?? "").trim(),
    message: String(b.message ?? "").trim(),
  };
  const invalid = validateVoucherOrder(order);
  if (invalid) return json({ error: invalid }, 400);
  try {
    return json({ url: await createCheckout(order) });
  } catch (e) {
    console.error(e);
    return json({ error: "Die Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es später erneut." }, 502);
  }
}

export async function GET(req: Request): Promise<Response> {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const u = new URL(req.url);
  try {
    const sessionId = u.searchParams.get("session_id");
    if (sessionId) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json({ error: "session" }, 400);
      const v = await fulfill(sessionId);
      if (!v) return json({ pending: true }, 202);
      return json({ voucher: publicVoucher(v), token: v.token });
    }
    const code = u.searchParams.get("c") ?? "";
    const token = u.searchParams.get("t") ?? "";
    const v = code ? await vouchers.byCode(code) : null;
    if (!v || !token || v.token !== token) return json({ error: "not_found" }, 404);
    return json({ voucher: publicVoucher(v), token: v.token });
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
}
