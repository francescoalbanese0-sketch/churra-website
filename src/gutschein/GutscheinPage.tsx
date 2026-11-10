import { useEffect, useState } from "react";
import { formatCHF, formatDateCH, type VoucherStatus } from "../../shared/voucher";
import { PHONE_DISPLAY, PHONE_HREF } from "../lib/info";
import styles from "./GutscheinPage.module.css";

interface PublicVoucher {
  code: string;
  amount: number;
  balance: number;
  buyerName: string;
  recipientName: string | null;
  message: string | null;
  expiresAt: string;
  status: VoucherStatus;
  createdAt: string;
}

/**
 * /gutschein?session_id=…  — back from Stripe: confirms the payment, shows the voucher.
 * /gutschein?c=CODE&t=…    — the voucher link from the e-mail (view, print, save as PDF).
 */
export default function GutscheinPage() {
  const q = new URLSearchParams(window.location.search);
  const sessionId = q.get("session_id");
  const [v, setV] = useState<PublicVoucher | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "pending" | "missing">("loading");

  useEffect(() => {
    document.title = "Gutschein – Churra";
    let cancelled = false;
    let tries = 0;
    const url = sessionId
      ? `/api/gutschein?session_id=${encodeURIComponent(sessionId)}`
      : `/api/gutschein?c=${encodeURIComponent(q.get("c") ?? "")}&t=${encodeURIComponent(q.get("t") ?? "")}`;
    const load = async () => {
      try {
        const r = await fetch(url);
        if (cancelled) return;
        if (r.status === 202 && tries++ < 12) {
          setState("pending");
          setTimeout(load, 1500);
          return;
        }
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { voucher: PublicVoucher; token: string };
        setV(d.voucher);
        setState("ready");
        // a clean, shareable address instead of the Stripe session id
        window.history.replaceState(null, "", `/gutschein?c=${encodeURIComponent(d.voucher.code)}&t=${encodeURIComponent(d.token)}`);
      } catch {
        if (!cancelled) setState(sessionId ? "pending" : "missing");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.page}>
      {state !== "ready" && (
        <a href="/" className={styles.logoLink}>
          <img src="/brand/churra-logo.png" alt="Churra" />
        </a>
      )}

      {state === "loading" && <p className={styles.info}>Gutschein wird geladen …</p>}
      {state === "pending" && (
        <div className={styles.box}>
          <h1>Zahlung wird bestätigt …</h1>
          <p>
            Das dauert normalerweise nur einen Moment. Ihr Gutschein kommt zusätzlich per E-Mail. Falls er in den nächsten
            Minuten nicht ankommt, rufen Sie uns an: <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
          </p>
        </div>
      )}
      {state === "missing" && (
        <div className={styles.box}>
          <h1>Gutschein nicht gefunden</h1>
          <p>
            Bitte prüfen Sie den Link aus Ihrer E-Mail oder rufen Sie uns an: <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
          </p>
          <a href="/#gutscheine" className={styles.secondary}>
            Gutschein kaufen
          </a>
        </div>
      )}

      {state === "ready" && v && (
        <>
          {sessionId && (
            <p className={`${styles.thanks} ${styles.noPrint}`}>
              Vielen Dank, {v.buyerName}! Ihr Gutschein ist bezahlt und wurde Ihnen per E-Mail gesendet.
            </p>
          )}

          <article className={styles.voucher}>
            <div className={styles.inner}>
              <img src="/brand/churra-logo.png" alt="Churra – Churrascaria Brazilian" className={styles.logo} />
              <p className={styles.label}>Gutschein</p>
              <p className={styles.amount}>{formatCHF(v.amount)}</p>
              {v.recipientName && <p className={styles.for}>für {v.recipientName}</p>}
              {v.message && <p className={styles.msg}>«{v.message}»</p>}
              <div className={styles.rule} aria-hidden="true">
                <span />
              </div>
              <p className={styles.code}>{v.code}</p>
              <p className={styles.terms}>
                Gültig bis {formatDateCH(v.expiresAt)} · einlösbar für Speisen und Getränke im Restaurant Churra · auch in
                Teilbeträgen · nicht in bar auszahlbar
              </p>
              <p className={styles.address}>Churra · Theaterweg 7 · 7000 Chur · 081 250 02 21 · www.churra.ch</p>
            </div>
            {v.status !== "active" && (
              <div className={styles.stamp}>{v.status === "redeemed" ? "Eingelöst" : "Ungültig"}</div>
            )}
          </article>

          {v.status === "active" && v.balance < v.amount && (
            <p className={`${styles.info} ${styles.noPrint}`}>Restguthaben: {formatCHF(v.balance)}</p>
          )}

          <div className={`${styles.actions} ${styles.noPrint}`}>
            <button type="button" className={styles.primary} onClick={() => window.print()}>
              Drucken / als PDF speichern
            </button>
            <a href="/#reservieren" className={styles.secondary}>
              Tisch reservieren
            </a>
          </div>
          <p className={`${styles.hint} ${styles.noPrint}`}>
            Tipp: Diesen Link können Sie auch direkt an die beschenkte Person weiterleiten.
          </p>
        </>
      )}
    </main>
  );
}
