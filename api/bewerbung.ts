import { CV_MAX_BYTES, CV_TYPES, JOBS, WORK_PERMITS } from "../shared/jobs.js";
import { SITE_URL, esc, frame, json } from "./_lib.js";

/**
 * POST /api/bewerbung — job application from the website.
 * Body: {job, name, email, phone, place?, start?, permit?, message?, consent, website(honeypot), cv?: {name, type, data(base64)}}
 * Sends the application (with the CV attached) to RESTAURANT_EMAIL and a short confirmation to the applicant.
 */
const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined) ?? "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function resend(payload: Record<string, unknown>): Promise<boolean> {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env("MAIL_FROM") || "Churra <reservierung@churra.ch>", ...payload }),
  });
  if (!res.ok) console.error("Resend", res.status, await res.text());
  return res.ok;
}

export async function POST(req: Request): Promise<Response> {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Die Datei ist zu gross oder die Anfrage ungültig." }, 400);
  }
  if (String(b.website ?? "")) return json({ ok: true }); // honeypot: pretend success
  const s = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const job = JOBS.find((j) => j.id === s("job", 40));
  const name = s("name", 80);
  const email = s("email", 120);
  const phone = s("phone", 40);
  const place = s("place", 80);
  const start = s("start", 60);
  const permit = WORK_PERMITS.includes(s("permit", 30) as (typeof WORK_PERMITS)[number]) ? s("permit", 30) : "";
  const message = s("message", 2000);

  if (!job) return json({ error: "Bitte wählen Sie eine Stelle aus." }, 400);
  if (name.length < 2) return json({ error: "Bitte geben Sie Ihren Namen an." }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse an." }, 400);
  if (phone.replace(/\D/g, "").length < 7) return json({ error: "Bitte geben Sie eine Telefonnummer an." }, 400);
  if (b.consent !== true) return json({ error: "Bitte bestätigen Sie den Datenschutzhinweis." }, 400);

  let attachment: { filename: string; content: string } | null = null;
  const cv = b.cv as { name?: string; type?: string; data?: string } | undefined;
  if (cv?.data) {
    const ext = CV_TYPES[String(cv.type)];
    const data = String(cv.data).replace(/^data:[^,]*,/, "");
    const bytes = Math.floor((data.length * 3) / 4);
    if (!ext) return json({ error: "Bitte laden Sie den Lebenslauf als PDF, Word, JPG oder PNG hoch." }, 400);
    if (bytes > CV_MAX_BYTES) return json({ error: "Die Datei ist zu gross (max. 3 MB)." }, 400);
    const base = name.replace(/[^A-Za-zÀ-ÿ0-9]+/g, "_").replace(/^_|_$/g, "") || "Bewerbung";
    attachment = { filename: `Lebenslauf_${base}.${ext}`, content: data };
  }

  const rows: [string, string][] = [
    ["Stelle", `${job.title} (${job.pensum})`],
    ["Name", name],
    ["E-Mail", email],
    ["Telefon", phone],
    ...(place ? ([["Wohnort", place]] as [string, string][]) : []),
    ...(start ? ([["Verfügbar ab", start]] as [string, string][]) : []),
    ...(permit ? ([["Arbeitsbewilligung", permit]] as [string, string][]) : []),
    ["Lebenslauf", attachment ? "im Anhang" : "nicht hochgeladen"],
  ];
  const table = `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#a89a84;font-size:14px;font-family:Arial,sans-serif;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-size:16px">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;

  const to = env("RESTAURANT_EMAIL") || "info@churra.ch";
  const ok = await resend({
    to: [to],
    reply_to: email,
    subject: `Bewerbung: ${job.title} – ${name}`,
    html: frame(`<p>Neue Bewerbung über die Website:</p>${table}${
      message ? `<p style="white-space:pre-wrap;border-left:2px solid #c9a15a;padding-left:12px">${esc(message)}</p>` : ""
    }<p style="font-size:14px;color:#a89a84">Auf diese E-Mail antworten = direkt an ${esc(name)} schreiben.</p>`),
    ...(attachment ? { attachments: [attachment] } : {}),
  }).catch((e) => {
    console.error(e);
    return false;
  });
  if (!ok) return json({ error: "Die Bewerbung konnte nicht gesendet werden. Bitte schreiben Sie uns an info@churra.ch." }, 502);

  await resend({
    to: [email],
    reply_to: to,
    subject: `Ihre Bewerbung bei Churra – ${job.title}`,
    html: frame(`<p>Guten Tag ${esc(name)}</p>
<p>Vielen Dank für Ihre Bewerbung als <strong>${esc(job.title)}</strong>. Wir haben Ihre Unterlagen erhalten und melden uns so bald wie möglich bei Ihnen.</p>
<p>Herzliche Grüsse<br/>Ihr Churra-Team</p>
<p style="font-size:13px;color:#a89a84"><a href="${SITE_URL()}" style="color:#f5af65">churra.ch</a> · Theaterweg 7, 7000 Chur</p>`),
  }).catch(() => false);

  return json({ ok: true });
}
