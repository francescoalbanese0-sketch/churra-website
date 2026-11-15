import { useRef, useState, type FormEvent } from "react";
import { useScrollReveal } from "../animations/useScrollReveal";
import { CV_MAX_BYTES, CV_TYPES, JOBS, JOB_BENEFITS, WORK_PERMITS } from "../../shared/jobs";
import styles from "./Jobs.module.css";

const readAsDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

/** Offene Stellen + Bewerbungsformular (mit Lebenslauf), versendet per E-Mail an das Restaurant. */
export function Jobs() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useScrollReveal(rootRef, [headRef, listRef, formRef], { start: "top 70%", stagger: 0.14 });

  const [job, setJob] = useState(JOBS[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [start, setStart] = useState("");
  const [permit, setPermit] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const apply = (id: string) => {
    setJob(id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickFile = (f: File | null) => {
    setError("");
    if (!f) return setFile(null);
    if (!CV_TYPES[f.type]) return setError("Bitte laden Sie den Lebenslauf als PDF, Word, JPG oder PNG hoch.");
    if (f.size > CV_MAX_BYTES) return setError("Die Datei ist zu gross (max. 3 MB). Tipp: als PDF speichern.");
    setFile(f);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Bitte geben Sie Ihren Namen an.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Bitte geben Sie eine gültige E-Mail-Adresse an.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Bitte geben Sie eine Telefonnummer an.");
    if (!consent) return setError("Bitte bestätigen Sie den Datenschutzhinweis.");
    setError("");
    setBusy(true);
    try {
      const cv = file ? { name: file.name, type: file.type, data: await readAsDataUrl(file) } : undefined;
      const res = await fetch("/api/bewerbung", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job, name, email, phone, place, start, permit, message, consent, website, cv }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || "Die Bewerbung konnte nicht gesendet werden.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bitte versuchen Sie es später erneut.");
    } finally {
      setBusy(false);
    }
  }

  const current = JOBS.find((j) => j.id === job);

  return (
    <section ref={rootRef} id="jobs" className={styles.section}>
      <div ref={headRef} className={styles.head}>
        <p className="label">Jobs</p>
        <h2 className={styles.title}>Arbeite mit uns am Feuer.</h2>
        <p className={styles.lead}>Für unser Team in Chur suchen wir Verstärkung – Gastgeber/innen mit Leidenschaft.</p>
        <ul className={styles.benefits}>
          {JOB_BENEFITS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <div ref={listRef} className={styles.jobs}>
        {JOBS.map((j) => (
          <article key={j.id} className={styles.job}>
            <p className={styles.meta}>
              {j.pensum} · {j.start}
            </p>
            <h3>{j.title}</h3>
            <p className={styles.intro}>{j.intro}</p>
            <div className={styles.cols}>
              <div>
                <h4>Deine Aufgaben</h4>
                <ul>
                  {j.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Dein Profil</h4>
                <ul>
                  {j.profile.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button type="button" className={styles.secondary} onClick={() => apply(j.id)}>
              Jetzt bewerben
            </button>
          </article>
        ))}
      </div>

      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        {sent ? (
          <div className={styles.sent} role="status">
            <h3>Vielen Dank für deine Bewerbung!</h3>
            <p>
              Wir haben deine Unterlagen erhalten und dir eine Bestätigung an <strong>{email}</strong> gesendet. Wir melden
              uns so bald wie möglich.
            </p>
          </div>
        ) : (
          <>
            <h3 className={styles.formTitle}>Bewerbung{current ? ` als ${current.title}` : ""}</h3>
            <div className={styles.fields}>
              <label className={styles.full}>
                <span>Stelle</span>
                <select value={job} onChange={(e) => setJob(e.target.value)}>
                  {JOBS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.pensum})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Vor- und Nachname</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
              </label>
              <label>
                <span>E-Mail</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </label>
              <label>
                <span>Telefon</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
              </label>
              <label>
                <span>Wohnort (optional)</span>
                <input value={place} onChange={(e) => setPlace(e.target.value)} autoComplete="address-level2" maxLength={80} />
              </label>
              <label>
                <span>Verfügbar ab (optional)</span>
                <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="z. B. sofort, 1. Dezember" maxLength={60} />
              </label>
              <label>
                <span>Arbeitsbewilligung (optional)</span>
                <select value={permit} onChange={(e) => setPermit(e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {WORK_PERMITS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.full}>
                <span>Kurz über dich (optional)</span>
                <textarea
                  rows={4}
                  value={message}
                  maxLength={2000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Erfahrung, Sprachen, was dich an Churra reizt …"
                />
              </label>
              <label className={`${styles.full} ${styles.file}`}>
                <span>Lebenslauf (PDF, Word, JPG oder PNG · max. 3 MB)</span>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                {file && <small>✓ {file.name}</small>}
              </label>
              <label className={styles.hp} aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            <label className={styles.consent}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Ich bin einverstanden, dass meine Angaben und Unterlagen zur Bearbeitung der Bewerbung gespeichert werden (
                <a href="/datenschutz">Datenschutz</a>).
              </span>
            </label>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Wird gesendet …" : "Bewerbung senden"}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
