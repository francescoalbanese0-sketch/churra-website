import { useEffect, useState } from "react";
import { MENU_LABEL, formatDateDE, formatGuests, type MenuChoice } from "../../shared/booking";
import { PHONE_DISPLAY, PHONE_HREF } from "../lib/info";
import styles from "./Cancel.module.css";

interface Res {
  date: string;
  time: string;
  adults: number;
  children: number;
  menu: MenuChoice;
  service: string;
  name: string;
  status: string;
}

/** /stornieren?id=…&t=… — guest cancels a booking from the confirmation e-mail. */
export default function Cancel() {
  const q = new URLSearchParams(window.location.search);
  const id = q.get("id") ?? "";
  const t = q.get("t") ?? "";
  const [res, setRes] = useState<Res | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "busy" | "done" | "error">("loading");

  useEffect(() => {
    document.title = "Reservierung stornieren – Churra";
    fetch(`/api/cancel?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setRes(d.reservation);
        setState(d.reservation.status === "cancelled" ? "done" : "ready");
      })
      .catch(() => setState("missing"));
  }, [id, t]);

  const cancel = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, t }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className={styles.page}>
      <a href="/" className={styles.logo}>
        <img src="/brand/churra-logo.png" alt="Churra" />
      </a>
      <div className={styles.card}>
        {state === "loading" && <p>Reservierung wird geladen …</p>}
        {state === "missing" && (
          <>
            <h1>Reservierung nicht gefunden</h1>
            <p>
              Der Link ist ungültig oder abgelaufen. Bitte rufen Sie uns an: <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            </p>
          </>
        )}
        {res && state !== "missing" && state !== "loading" && (
          <>
            <h1>{state === "done" ? "Reservierung storniert" : "Reservierung stornieren?"}</h1>
            <dl>
              <dt>Name</dt>
              <dd>{res.name}</dd>
              <dt>Datum</dt>
              <dd>{formatDateDE(res.date)}</dd>
              <dt>Uhrzeit</dt>
              <dd>{res.time} Uhr</dd>
              <dt>Personen</dt>
              <dd>
                {formatGuests(res.adults, res.children)}
              </dd>
              <dt>Menü</dt>
              <dd>{res.service === "lunch" && res.menu === "buffet" ? "Mittagsbuffet" : MENU_LABEL[res.menu]}</dd>
            </dl>
            {state === "done" ? (
              <p>Ihre Reservierung wurde storniert. Wir hoffen, Sie bald bei uns begrüssen zu dürfen.</p>
            ) : (
              <>
                {state === "error" && <p className={styles.error}>Das hat nicht geklappt. Bitte rufen Sie uns an: {PHONE_DISPLAY}</p>}
                <button type="button" onClick={cancel} disabled={state === "busy"}>
                  {state === "busy" ? "Wird storniert …" : "Ja, Reservierung stornieren"}
                </button>
              </>
            )}
          </>
        )}
        <a href="/" className={styles.back}>
          ← zur Website
        </a>
      </div>
    </main>
  );
}
