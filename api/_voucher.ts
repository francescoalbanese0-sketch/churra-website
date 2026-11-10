/**
 * Gutscheine: Stripe Checkout (no SDK, plain HTTPS), fulfilment, storage and e-mails.
 *
 * Extra environment variables (Vercel → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY      sk_live_… (or sk_test_… to try it out)
 *   STRIPE_WEBHOOK_SECRET  whsec_… from the Stripe webhook for /api/stripe-webhook
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  CODE_ALPHABET,
  VOUCHER_VALID_YEARS,
  formatCHF,
  formatCode,
  formatDateCH,
  type VoucherOrder,
  type VoucherStatus,
} from "../shared/voucher.js";
import { SITE_URL, esc, frame, sb, sendMail } from "./_lib.js";

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined) ?? "";
const enc = encodeURIComponent;

export const stripeConfigured = () => Boolean(env("STRIPE_SECRET_KEY"));

export interface Voucher {
  id: string;
  created_at: string;
  code: string;
  token: string;
  amount: number;
  balance: number;
  buyer_name: string;
  buyer_email: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: string;
  status: VoucherStatus;
  source: string;
  stripe_session_id: string | null;
  history: { at: string; amount: number; note?: string }[];
}

/** What a guest may see through the voucher link. */
export const publicVoucher = (v: Voucher) => ({
  code: v.code,
  amount: Number(v.amount),
  balance: Number(v.balance),
  buyerName: v.buyer_name,
  recipientName: v.recipient_name,
  message: v.message,
  expiresAt: v.expires_at,
  status: v.status,
  createdAt: v.created_at,
});

export const voucherLink = (v: Pick<Voucher, "code" | "token">) =>
  `${SITE_URL()}/gutschein?c=${enc(v.code)}&t=${enc(v.token)}`;

// ---------- Stripe

function form(obj: Record<string, string | number>, prefix = ""): string[] {
  return Object.entries(obj).map(([k, v]) => `${enc(prefix ? `${prefix}[${k}]` : k)}=${enc(String(v))}`);
}

async function stripe(path: string, params?: string[]): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      ...(params ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? params.join("&") : undefined,
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

export async function createCheckout(o: VoucherOrder): Promise<string> {
  const site = SITE_URL();
  const forWhom = o.recipientName ? `Für ${o.recipientName}` : "Einlösbar im Restaurant Churra, Chur";
  const params = [
    ...form({
      mode: "payment",
      locale: "de",
      customer_email: o.buyerEmail,
      success_url: `${site}/gutschein?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/#gutscheine`,
    }),
    ...form(
      {
        "0][quantity": 1,
        "0][price_data][currency": "chf",
        "0][price_data][unit_amount": o.amount * 100,
        "0][price_data][product_data][name": `Churra Gutschein ${formatCHF(o.amount)}`,
        "0][price_data][product_data][description": forWhom,
      },
      "line_items",
    ),
    ...form(
      {
        kind: "gutschein",
        amount: o.amount,
        buyer_name: o.buyerName,
        recipient_name: o.recipientName,
        message: o.message,
      },
      "metadata",
    ),
    ...form({ description: `Churra Gutschein ${formatCHF(o.amount)} – ${o.buyerName}` }, "payment_intent_data"),
  ];
  const s = await stripe("checkout/sessions", params);
  return String(s.url);
}

/** Verifies the Stripe-Signature header (v1 = HMAC-SHA256 of "timestamp.body"). */
export function verifyStripeSignature(body: string, header: string | null): boolean {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest();
  return sigs.some((s) => {
    const b = Buffer.from(s, "hex");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

// ---------- storage

export const vouchers = {
  async bySession(id: string): Promise<Voucher | null> {
    const rows = (await sb(`vouchers?select=*&stripe_session_id=eq.${enc(id)}`)) as Voucher[];
    return rows[0] ?? null;
  },
  async byCode(code: string): Promise<Voucher | null> {
    const rows = (await sb(`vouchers?select=*&code=eq.${enc(code)}`)) as Voucher[];
    return rows[0] ?? null;
  },
  async byId(id: string): Promise<Voucher | null> {
    const rows = (await sb(`vouchers?select=*&id=eq.${enc(id)}`)) as Voucher[];
    return rows[0] ?? null;
  },
  async list(q: string): Promise<Voucher[]> {
    const s = q.trim().replace(/[,()*]/g, " ").trim();
    const filter = s
      ? `&or=(code.ilike.*${enc(s)}*,buyer_name.ilike.*${enc(s)}*,recipient_name.ilike.*${enc(s)}*,buyer_email.ilike.*${enc(s)}*)`
      : "";
    return (await sb(`vouchers?select=*${filter}&order=created_at.desc&limit=200`)) as Voucher[];
  },
  /** Inserts once per Stripe session; returns null when that session already has a voucher. */
  async insert(v: Partial<Voucher>): Promise<Voucher | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const rows = (await sb("vouchers?on_conflict=stripe_session_id", {
          method: "POST",
          headers: { prefer: "return=representation,resolution=ignore-duplicates" },
          body: JSON.stringify({ ...v, code: newCode() }),
        })) as Voucher[];
        return rows[0] ?? null;
      } catch (e) {
        // a code collision (unique code) — just draw another one
        if (!String(e).includes("vouchers_code_key")) throw e;
      }
    }
    throw new Error("could not generate a unique code");
  },
  /** Optimistic update: only applies if the balance did not change in the meantime. */
  async patch(id: string, patch: Partial<Voucher>, expectBalance?: number): Promise<Voucher | null> {
    const guard = expectBalance === undefined ? "" : `&balance=eq.${expectBalance}`;
    const rows = (await sb(`vouchers?id=eq.${enc(id)}${guard}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(patch),
    })) as Voucher[];
    return rows[0] ?? null;
  },
};

function newCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return formatCode(s);
}

export function expiryFrom(d = new Date()): string {
  const e = new Date(d);
  e.setFullYear(e.getFullYear() + VOUCHER_VALID_YEARS);
  return e.toISOString().slice(0, 10);
}

/**
 * Creates the voucher for a paid Checkout Session (idempotent — called by the webhook
 * and by the thank-you page, whichever comes first) and sends the e-mails once.
 */
export async function fulfill(sessionId: string): Promise<Voucher | null> {
  const existing = await vouchers.bySession(sessionId);
  if (existing) return existing;
  const s = await stripe(`checkout/sessions/${enc(sessionId)}`);
  const md = (s.metadata ?? {}) as Record<string, string>;
  if (md.kind !== "gutschein" || s.payment_status !== "paid") return null;
  const amount = Number(s.amount_total) / 100;
  const details = (s.customer_details ?? {}) as { email?: string };
  const v = await vouchers.insert({
    amount,
    balance: amount,
    buyer_name: md.buyer_name || "—",
    buyer_email: details.email || (s.customer_email as string) || null,
    recipient_name: md.recipient_name || null,
    message: md.message || null,
    expires_at: expiryFrom(),
    source: "online",
    stripe_session_id: sessionId,
  });
  if (!v) return vouchers.bySession(sessionId); // a parallel call won the race and sends the mails
  await Promise.all([mailBuyer(v), mailRestaurantVoucher(v)]);
  return v;
}

// ---------- e-mails

export function voucherCard(v: Voucher) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #c9a15a">
<tr><td style="padding:28px 20px 6px;text-align:center;letter-spacing:6px;font-size:13px;color:#c9a15a">GUTSCHEIN</td></tr>
<tr><td style="padding:0 20px;text-align:center;font-size:44px;color:#f5af65">${formatCHF(Number(v.amount))}</td></tr>
${v.recipient_name ? `<tr><td style="padding:8px 20px 0;text-align:center;font-size:17px">für ${esc(v.recipient_name)}</td></tr>` : ""}
${v.message ? `<tr><td style="padding:14px 28px 0;text-align:center;font-size:15px;font-style:italic;color:#d8cbb4">«${esc(v.message)}»</td></tr>` : ""}
<tr><td style="padding:18px 20px 4px;text-align:center;font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;color:#ede4d3">${esc(v.code)}</td></tr>
<tr><td style="padding:0 20px 24px;text-align:center;font-size:12px;color:#a89a84;font-family:Arial,sans-serif">
Gültig bis ${formatDateCH(v.expires_at)} · einlösbar im Restaurant Churra, Theaterweg 7, Chur · nicht in bar auszahlbar</td></tr>
</table>`;
}

async function mailBuyer(v: Voucher) {
  if (!v.buyer_email) return;
  const link = voucherLink(v);
  await sendMail(
    v.buyer_email,
    `Ihr Churra Gutschein ${formatCHF(Number(v.amount))} – ${v.code}`,
    frame(`<p>Guten Tag ${esc(v.buyer_name)}</p>
<p>Vielen Dank für Ihren Einkauf! Hier ist Ihr Gutschein${v.recipient_name ? ` für ${esc(v.recipient_name)}` : ""}:</p>
${voucherCard(v)}
<p style="text-align:center;margin:24px 0">
<a href="${link}" style="display:inline-block;padding:14px 28px;border:1px solid #f5af65;color:#f5af65;text-decoration:none;letter-spacing:2px;font-size:13px;font-family:Arial,sans-serif">GUTSCHEIN ÖFFNEN &amp; DRUCKEN</a></p>
<p style="font-size:14px;color:#a89a84">Sie können den Gutschein ausdrucken oder weiterleiten. Zum Einlösen genügt der Code beim Bezahlen im Restaurant.
Tisch reservieren: <a href="${SITE_URL()}/#reservieren" style="color:#f5af65">churra.ch</a></p>`),
    env("RESTAURANT_EMAIL") || "info@churra.ch",
  );
}

async function mailRestaurantVoucher(v: Voucher) {
  await sendMail(
    env("RESTAURANT_EMAIL") || "info@churra.ch",
    `Gutschein verkauft: ${formatCHF(Number(v.amount))} – ${v.buyer_name} (${v.code})`,
    frame(`<p>Online wurde ein Gutschein verkauft und bezahlt.</p>${voucherCard(v)}
<p>Käufer: ${esc(v.buyer_name)}${v.buyer_email ? ` · ${esc(v.buyer_email)}` : ""}</p>
<p><a href="${SITE_URL()}/admin/gutscheine" style="color:#f5af65">Alle Gutscheine</a></p>`),
    v.buyer_email ?? undefined,
  );
}

/** Admin: send (or resend) the voucher to an e-mail address. */
export async function mailVoucherTo(v: Voucher, to: string) {
  const old = v.buyer_email;
  await mailBuyer({ ...v, buyer_email: to || old });
}
