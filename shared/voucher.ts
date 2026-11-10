/** Gutscheine (gift vouchers) — shared between the site, the admin and the API. */

export const VOUCHER_PRESETS = [50, 100, 150, 200] as const;
export const VOUCHER_MIN = 50;
export const VOUCHER_MAX = 1000;
/** How long a voucher is valid after purchase. */
export const VOUCHER_VALID_YEARS = 2;
export const VOUCHER_MESSAGE_MAX = 240;

export type VoucherStatus = "active" | "redeemed" | "cancelled";

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  active: "Gültig",
  redeemed: "Eingelöst",
  cancelled: "Storniert",
};

export interface VoucherOrder {
  amount: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns a German error message, or null when the order is valid. */
export function validateVoucherOrder(o: VoucherOrder): string | null {
  if (!Number.isInteger(o.amount) || o.amount < VOUCHER_MIN || o.amount > VOUCHER_MAX)
    return `Bitte wählen Sie einen Betrag zwischen CHF ${VOUCHER_MIN} und CHF ${VOUCHER_MAX}.`;
  if (o.buyerName.trim().length < 2) return "Bitte geben Sie Ihren Namen an.";
  if (!EMAIL_RE.test(o.buyerEmail.trim())) return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  if (o.recipientName.length > 80) return "Der Name der beschenkten Person ist zu lang.";
  if (o.message.length > VOUCHER_MESSAGE_MAX) return `Die Widmung darf höchstens ${VOUCHER_MESSAGE_MAX} Zeichen lang sein.`;
  return null;
}

/** "CHF 100.–" / "CHF 42.50" */
export function formatCHF(n: number): string {
  const v = Math.round(n * 100) / 100;
  return Number.isInteger(v) ? `CHF ${v}.–` : `CHF ${v.toFixed(2)}`;
}

/** "CH-7KQ2-M9XA" — no 0/O/1/I to avoid typos at the till. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** The 8 code characters from whatever was typed ("ch-7kq2 m9xa", "7KQ2M9XA" …). */
export const normalizeCode = (s: string) => {
  const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 10 && raw.startsWith("CH") ? raw.slice(2) : raw;
};
/** True for a full voucher code as printed ("CH-7KQ2-M9XA", case and dashes don't matter). */
export const isVoucherCode = (s: string) => {
  const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 10 && raw.startsWith("CH") && [...raw.slice(2)].every((c) => CODE_ALPHABET.includes(c));
};
export const formatCode = (raw: string) => {
  const c = normalizeCode(raw);
  return `CH-${c.slice(0, 4)}-${c.slice(4, 8)}`;
};

/** "31.12.2028" from "2028-12-31" */
export const formatDateCH = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};
