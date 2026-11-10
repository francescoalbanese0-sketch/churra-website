import { useRef, useState, type FormEvent } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import {
  VOUCHER_MAX,
  VOUCHER_MESSAGE_MAX,
  VOUCHER_MIN,
  VOUCHER_PRESETS,
  VOUCHER_VALID_YEARS,
  formatCHF,
  validateVoucherOrder,
} from "../../shared/voucher";
import styles from "./Vouchers.module.css";

/** Gutscheine online kaufen — paid by card / TWINT via Stripe Checkout, delivered by e-mail. */
export function Vouchers() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useScrollReveal(rootRef, [headRef, cardRef, formRef], { start: "top 70%", stagger: 0.14 });

  const [preset, setPreset] = useState<number | "custom">(100);
  const [custom, setCustom] = useState("");
  const [recipientName, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = preset === "custom" ? Math.round(Number(custom.replace(",", "."))) || 0 : preset;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const order = { amount, buyerName, buyerEmail, recipientName: recipientName.trim(), message: message.trim() };
    const invalid = validateVoucherOrder(order);
    if (invalid) return setError(invalid);
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/gutschein", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...order, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Die Zahlung konnte nicht gestartet werden.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bitte versuchen Sie es später erneut.");
      setBusy(false);
    }
  }

  return (
    <section ref={rootRef} id="gutscheine" className={styles.section}>
      <div ref={headRef} className={styles.head}>
        <p className="label">Gutscheine</p>
        <h2 className={styles.title}>Ein Abend am Feuer – zum Verschenken.</h2>
        <p className={styles.lead}>
          Online kaufen, sofort per E-Mail erhalten und ausdrucken oder weiterleiten. Einlösbar für Rodízio, Buffet und
          Getränke.
        </p>
      </div>

      <div className={styles.grid}>
        <div ref={cardRef} className={styles.preview} aria-hidden="true">
          <div className={styles.voucher}>
            <img src="/brand/churra-logo.png" alt="" className={styles.vLogo} />
            <span className={styles.vLabel}>Gutschein</span>
            <span className={styles.vAmount}>{amount >= VOUCHER_MIN ? formatCHF(amount) : "CHF —"}</span>
            {recipientName.trim() && <span className={styles.vFor}>für {recipientName.trim()}</span>}
            {message.trim() && <span className={styles.vMsg}>«{message.trim()}»</span>}
            <span className={styles.vCode}>CH-XXXX-XXXX</span>
            <span className={styles.vFoot}>Theaterweg 7 · Chur · churra.ch</span>
          </div>
        </div>

        <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
          <fieldset className={styles.amounts}>
            <legend>Betrag</legend>
            <div className={styles.chips}>
              {VOUCHER_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.chip} ${preset === p ? styles.chipOn : ""}`}
                  aria-pressed={preset === p}
                  onClick={() => setPreset(p)}
                >
                  CHF {p}
                </button>
              ))}
              <button
                type="button"
                className={`${styles.chip} ${preset === "custom" ? styles.chipOn : ""}`}
                aria-pressed={preset === "custom"}
                onClick={() => setPreset("custom")}
              >
                Anderer Betrag
              </button>
            </div>
            {preset === "custom" && (
              <label className={styles.customAmount}>
                <span>CHF</span>
                <input
                  inputMode="numeric"
                  autoFocus
                  placeholder={`${VOUCHER_MIN}–${VOUCHER_MAX}`}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                />
              </label>
            )}
          </fieldset>

          <div className={styles.fields}>
            <label>
              <span>Für (optional)</span>
              <input value={recipientName} maxLength={80} onChange={(e) => setRecipient(e.target.value)} placeholder="Name der beschenkten Person" />
            </label>
            <label className={styles.full}>
              <span>
                Widmung (optional) <small>{message.length}/{VOUCHER_MESSAGE_MAX}</small>
              </span>
              <textarea
                rows={2}
                value={message}
                maxLength={VOUCHER_MESSAGE_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Alles Gute zum Geburtstag!"
              />
            </label>
            <label>
              <span>Ihr Name</span>
              <input value={buyerName} autoComplete="name" maxLength={80} onChange={(e) => setBuyerName(e.target.value)} required />
            </label>
            <label>
              <span>Ihre E-Mail</span>
              <input type="email" value={buyerEmail} autoComplete="email" onChange={(e) => setBuyerEmail(e.target.value)} required />
            </label>
            <label className={styles.hp} aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Weiter zur Zahlung …" : `Jetzt kaufen · ${amount >= VOUCHER_MIN ? formatCHF(amount) : "CHF —"}`}
            </button>
            <p className={styles.pay}>Karte · Apple Pay · Google Pay · TWINT — sichere Zahlung über Stripe</p>
          </div>
          <p className={styles.note}>
            Der Gutschein kommt sofort nach der Zahlung per E-Mail, ist {VOUCHER_VALID_YEARS} Jahre gültig, auch in
            Teilbeträgen einlösbar und nicht in bar auszahlbar.
          </p>
        </form>
      </div>
    </section>
  );
}
