import { useCallback, useEffect, useState } from "react";
import { VOUCHER_STATUS_LABEL, formatCHF, formatDateCH, type VoucherStatus } from "../../shared/voucher";
import base from "./Admin.module.css";
import styles from "./Gutscheine.module.css";

interface Voucher {
  id: string;
  created_at: string;
  code: string;
  amount: number;
  balance: number;
  buyer_name: string;
  buyer_email: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: string;
  status: VoucherStatus;
  source: string;
  history: { at: string; amount: number; note?: string }[];
  link: string;
}

const KEY = "churra-admin-key";
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  set: (v: string) => {
    try {
      if (v) sessionStorage.setItem(KEY, v);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* private mode */
    }
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const dt = (iso: string) =>
  new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/** /admin/gutscheine — find a voucher at the till, deduct amounts, sell vouchers at the counter. */
export default function Gutscheine() {
  const [key, setKey] = useState(store.get);
  const [authed, setAuthed] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<Voucher[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    document.title = "Gutscheine – Churra";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
  }, []);

  const api = useCallback(
    async (method: "GET" | "POST", qs: string, body?: unknown) => {
      const r = await fetch(`/api/admin-gutscheine${qs}`, {
        method,
        headers: { "x-admin-key": key, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setAuthed(false);
        store.set("");
        throw new Error("Passwort falsch.");
      }
      if (r.status === 503) throw new Error("Die Datenbank ist noch nicht verbunden.");
      if (!r.ok) throw new Error(d.error && d.error !== "server" ? d.error : "Fehler – ist die Tabelle «vouchers» in Supabase angelegt?");
      return d;
    },
    [key],
  );

  const load = useCallback(
    async (query = q) => {
      try {
        const d = await api("GET", `?q=${encodeURIComponent(query)}`);
        setList(d.vouchers);
        setAuthed(true);
        setError(null);
        if (d.vouchers.length === 1) setOpen(d.vouchers[0].id);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [api, q],
  );

  useEffect(() => {
    if (key) load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <main className={base.login}>
        <img src="/brand/churra-logo.png" alt="Churra" />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            store.set(key);
            await load("");
          }}
        >
          <h1>Gutscheine</h1>
          <label>
            Passwort
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          </label>
          {error && <p className={base.error}>{error}</p>}
          <button type="submit" className={base.primary}>
            Anmelden
          </button>
        </form>
      </main>
    );
  }

  const act = async (body: Record<string, unknown>) => {
    try {
      const d = await api("POST", "", body);
      if (d.voucher) setList((l) => l.map((v) => (v.id === d.voucher.id ? d.voucher : v)));
      return d;
    } catch (e) {
      alert((e as Error).message);
      return null;
    }
  };

  const sold = list.filter((v) => v.status !== "cancelled").reduce((s, v) => s + v.amount, 0);
  const open_ = list.filter((v) => v.status === "active").reduce((s, v) => s + v.balance, 0);

  return (
    <div className={base.app}>
      <header className={base.top}>
        <img src="/brand/churra-logo.png" alt="Churra" className={base.logo} />
        <form
          className={styles.search}
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Code, Name oder E-Mail suchen"
            autoFocus
            autoCapitalize="characters"
          />
          <button type="submit" className={base.primary}>
            Suchen
          </button>
        </form>
        <div className={base.topActions}>
          <button type="button" className={base.primary} onClick={() => setShowNew(true)}>
            + Gutschein (Kasse)
          </button>
          <a href="/admin" className={base.ghost}>
            Agenda
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {error && <p className={base.error}>{error}</p>}
        <p className={styles.totals}>
          {list.length} Gutscheine angezeigt · verkauft {formatCHF(sold)} · offenes Guthaben {formatCHF(open_)}
        </p>

        {list.length === 0 && <p className={styles.empty}>Keine Gutscheine gefunden.</p>}

        <ul className={styles.list}>
          {list.map((v) => {
            const expired = v.status === "active" && v.expires_at < today();
            return (
              <li key={v.id} className={`${styles.item} ${v.status !== "active" || expired ? styles.dim : ""}`}>
                <button type="button" className={styles.row} onClick={() => setOpen(open === v.id ? null : v.id)}>
                  <span className={styles.code}>{v.code}</span>
                  <span className={styles.amount}>
                    {formatCHF(v.balance)}
                    {v.balance !== v.amount && <small> von {formatCHF(v.amount)}</small>}
                  </span>
                  <span className={styles.who}>
                    {v.recipient_name ? `für ${v.recipient_name} · ` : ""}
                    {v.buyer_name}
                  </span>
                  <span className={`${styles.badge} ${styles[v.status]} ${expired ? styles.expired : ""}`}>
                    {expired ? "Abgelaufen" : VOUCHER_STATUS_LABEL[v.status]}
                  </span>
                </button>
                {open === v.id && <Details v={v} act={act} />}
              </li>
            );
          })}
        </ul>
      </main>

      {showNew && (
        <NewVoucher
          onClose={() => setShowNew(false)}
          onCreate={async (body) => {
            const d = await act({ action: "create", ...body });
            if (d?.voucher) {
              setList((l) => [d.voucher, ...l]);
              setOpen(d.voucher.id);
              setShowNew(false);
            }
          }}
        />
      )}
    </div>
  );
}

function Details({ v, act }: { v: Voucher; act: (b: Record<string, unknown>) => Promise<{ voucher?: Voucher } | null> }) {
  const [amount, setAmount] = useState(String(v.balance));
  const [note, setNote] = useState("");
  const expired = v.expires_at < today();

  const redeem = async () => {
    const n = Number(amount.replace(",", "."));
    if (!(n > 0)) return alert("Bitte einen Betrag eingeben.");
    if (!window.confirm(`${formatCHF(n)} vom Gutschein ${v.code} abziehen?`)) return;
    const d = await act({ action: "redeem", id: v.id, amount: n, note, ignoreExpiry: expired });
    if (d?.voucher) {
      setAmount(String(d.voucher.balance));
      setNote("");
    }
  };

  return (
    <div className={styles.details}>
      <dl>
        <dt>Wert</dt>
        <dd>{formatCHF(v.amount)}</dd>
        <dt>Restguthaben</dt>
        <dd>{formatCHF(v.balance)}</dd>
        <dt>Gültig bis</dt>
        <dd>
          {formatDateCH(v.expires_at)}
          {expired && " (abgelaufen)"}
        </dd>
        <dt>Gekauft</dt>
        <dd>
          {dt(v.created_at)} · {v.source === "online" ? "online bezahlt" : "an der Kasse"}
        </dd>
        <dt>Käufer</dt>
        <dd>
          {v.buyer_name}
          {v.buyer_email && ` · ${v.buyer_email}`}
        </dd>
        {v.recipient_name && (
          <>
            <dt>Für</dt>
            <dd>{v.recipient_name}</dd>
          </>
        )}
        {v.message && (
          <>
            <dt>Widmung</dt>
            <dd>«{v.message}»</dd>
          </>
        )}
      </dl>

      {v.history?.length > 0 && (
        <div className={styles.history}>
          <p>Einlösungen</p>
          <ul>
            {v.history.map((h, i) => (
              <li key={i}>
                {dt(h.at)} · − {formatCHF(h.amount)}
                {h.note ? ` · ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.status === "active" && (
        <div className={styles.redeem}>
          <label>
            Betrag abziehen (CHF)
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Notiz (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Tisch 7" />
          </label>
          <button type="button" className={base.primary} onClick={redeem}>
            Einlösen
          </button>
        </div>
      )}

      <div className={styles.more}>
        <a href={v.link} target="_blank" rel="noreferrer" className={base.ghost}>
          Gutschein ansehen / drucken
        </a>
        <button
          type="button"
          className={base.ghost}
          onClick={() => {
            const to = window.prompt("An welche E-Mail-Adresse senden?", v.buyer_email ?? "");
            if (to) act({ action: "send", id: v.id, email: to }).then((d) => d && alert("Gesendet."));
          }}
        >
          Per E-Mail senden
        </button>
        {v.status === "cancelled" ? (
          <button type="button" className={base.ghost} onClick={() => act({ action: "reactivate", id: v.id })}>
            Wieder aktivieren
          </button>
        ) : (
          <button
            type="button"
            className={base.ghost}
            onClick={() => window.confirm(`Gutschein ${v.code} stornieren? Er kann dann nicht mehr eingelöst werden.`) && act({ action: "cancel", id: v.id })}
          >
            Stornieren
          </button>
        )}
      </div>
    </div>
  );
}

function NewVoucher({ onClose, onCreate }: { onClose: () => void; onCreate: (b: Record<string, unknown>) => Promise<void> }) {
  const [f, setF] = useState({ amount: "100", buyerName: "", recipientName: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <form
        className={styles.modal}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onCreate({ ...f, amount: Number(f.amount.replace(",", ".")) });
          setBusy(false);
        }}
      >
        <h2>Gutschein an der Kasse verkaufen</h2>
        <p className={styles.hint}>Für bar oder mit dem Kartenterminal bezahlte Gutscheine. Es wird ein Code erzeugt – mit E-Mail wird er auch gesendet.</p>
        <label>
          Betrag (CHF)
          <input inputMode="decimal" value={f.amount} onChange={set("amount")} required />
        </label>
        <label>
          Käufer
          <input value={f.buyerName} onChange={set("buyerName")} required />
        </label>
        <label>
          Für (optional)
          <input value={f.recipientName} onChange={set("recipientName")} />
        </label>
        <label>
          E-Mail (optional)
          <input type="email" value={f.email} onChange={set("email")} />
        </label>
        <label>
          Widmung (optional)
          <input value={f.message} onChange={set("message")} maxLength={240} />
        </label>
        <div className={styles.modalActions}>
          <button type="button" className={base.ghost} onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className={base.primary} disabled={busy}>
            Gutschein erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
