import { useEffect } from "react";
import { EMAIL } from "../lib/info";
import styles from "./Legal.module.css";

const COMPANY = "Pizza Grill Chur GmbH";
const UID = "CHE-322.410.230";
const MANAGER = "Michele Martone";
const STAND = "Oktober 2026";

function Address() {
  return (
    <p>
      {COMPANY}
      <br />
      Restaurant Churra
      <br />
      Theaterweg 7
      <br />
      7000 Chur, Schweiz
      <br />
      Telefon <a href="tel:+41812500221">+41 81 250 02 21</a>
      <br />
      E-Mail <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
    </p>
  );
}

function Impressum() {
  return (
    <>
      <h1>Impressum</h1>
      <h2>Betreiberin dieser Website</h2>
      <Address />
      <h2>Handelsregister</h2>
      <p>
        Handelsregister des Kantons Graubünden
        <br />
        UID: {UID}
        <br />
        Vertretungsberechtigte Person: {MANAGER}, Geschäftsführer
      </p>
      <h2>Haftung</h2>
      <p>
        Die Inhalte dieser Website werden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
        Aktualität der Inhalte, insbesondere von Preisen und Öffnungszeiten, übernehmen wir keine Gewähr. Für Inhalte
        verlinkter Websites sind ausschliesslich deren Betreiber verantwortlich.
      </p>
      <h2>Urheberrechte</h2>
      <p>
        Texte, Fotos, Logo und Gestaltung dieser Website gehören der {COMPANY} oder den jeweiligen Rechteinhabern. Jede
        Verwendung ausserhalb dieser Website bedarf der vorherigen schriftlichen Zustimmung.
      </p>
      <p className={styles.small}>
        Siehe auch unsere <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <p>
        Mit dieser Datenschutzerklärung informieren wir Sie, welche Personendaten wir im Zusammenhang mit unserer Website
        und unseren Reservierungen bearbeiten. Massgebend ist das Schweizer Datenschutzgesetz (DSG).
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <Address />

      <h2>2. Tischreservierung</h2>
      <p>
        Wenn Sie online oder telefonisch einen Tisch reservieren, bearbeiten wir folgende Angaben: Name, E-Mail-Adresse,
        Telefonnummer, Datum und Uhrzeit, Anzahl Personen und Kinder, gewähltes Menü sowie Ihre Anmerkungen. Wir
        verwenden diese Daten ausschliesslich, um Ihre Reservierung zu bearbeiten, Ihnen eine Bestätigung zu senden und
        Sie bei Fragen oder Änderungen zu kontaktieren. Es erfolgt keine Werbung und keine Weitergabe zu Werbezwecken.
      </p>
      <p>
        Reservierungsdaten werden spätestens 12 Monate nach dem Reservierungsdatum automatisch gelöscht. Sie können Ihre
        Reservierung jederzeit über den Link in der Bestätigungs-E-Mail stornieren.
      </p>

      <h2>3. Kontakt per E-Mail oder Telefon</h2>
      <p>
        Wenn Sie uns kontaktieren, verwenden wir Ihre Angaben nur zur Beantwortung Ihrer Anfrage und bewahren sie nur so
        lange auf, wie es dafür nötig ist.
      </p>

      <h2>4. Dienstleister und Bekanntgabe ins Ausland</h2>
      <p>Für den Betrieb der Website und der Reservierungen setzen wir folgende Dienstleister ein:</p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) – Hosting der Website. Beim Aufruf werden technische Daten wie
          IP-Adresse, Datum, Uhrzeit und Browser kurzzeitig in Server-Protokollen erfasst.
        </li>
        <li>
          <strong>Supabase Inc.</strong> (USA) – Datenbank, in der die Reservierungen gespeichert werden.
        </li>
        <li>
          <strong>Resend Inc.</strong> (USA) – Versand der Bestätigungs- und Stornierungs-E-Mails.
        </li>
        <li>
          <strong>Google Fonts</strong> (Google Ireland Ltd. / Google LLC) – Schriftarten. Dabei wird Ihre IP-Adresse an
          Google übermittelt.
        </li>
      </ul>
      <p>
        Diese Anbieter können Daten auch ausserhalb der Schweiz bearbeiten, insbesondere in der EU und den USA. Wir
        achten darauf, dass ein angemessener Datenschutz gewährleistet ist, etwa durch das Swiss-U.S. Data Privacy
        Framework oder die Standardvertragsklauseln der EU-Kommission.
      </p>

      <h2>5. Cookies und Tracking</h2>
      <p>
        Diese Website verwendet keine Analyse- oder Werbe-Cookies und kein Tracking. Der Link zu Google Maps öffnet die
        Karte erst, wenn Sie ihn anklicken.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie können jederzeit Auskunft über Ihre bei uns gespeicherten Daten verlangen sowie deren Berichtigung oder
        Löschung fordern. Schreiben Sie uns dazu an <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Sie haben zudem das Recht,
        sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren.
      </p>

      <h2>7. Änderungen</h2>
      <p>Wir können diese Datenschutzerklärung jederzeit anpassen. Es gilt die auf dieser Website veröffentlichte Fassung.</p>
      <p className={styles.small}>Stand: {STAND}</p>
    </>
  );
}

export default function Legal({ kind }: { kind: "impressum" | "datenschutz" }) {
  useEffect(() => {
    document.title = `${kind === "impressum" ? "Impressum" : "Datenschutz"} – Churra`;
    window.scrollTo(0, 0);
  }, [kind]);

  return (
    <main className={styles.page}>
      <a href="/" className={styles.logo}>
        <img src="/brand/churra-logo.png" alt="Churra – zur Startseite" />
      </a>
      <article className={styles.doc}>{kind === "impressum" ? <Impressum /> : <Datenschutz />}</article>
      <nav className={styles.links}>
        <a href="/">Startseite</a>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
      </nav>
    </main>
  );
}
