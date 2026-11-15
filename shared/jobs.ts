/** Offene Stellen — edit this list to add, change or remove a job on the website. */

export interface Job {
  id: string;
  title: string;
  pensum: string;
  start: string;
  intro: string;
  tasks: string[];
  profile: string[];
}

export const JOBS: Job[] = [
  {
    id: "service",
    title: "Servicemitarbeiter/in",
    pensum: "100 %",
    start: "ab sofort oder nach Vereinbarung",
    intro:
      "Du bist Gastgeber/in mit Herz: Du empfängst unsere Gäste, erklärst das Rodízio-Erlebnis und sorgst dafür, dass sich jeder Tisch wohlfühlt.",
    tasks: [
      "Empfang und Betreuung unserer Gäste",
      "Erklären von Rodízio, Buffet und Getränkekarte",
      "Bestellungen, Servieren und Abrechnen",
      "Mitarbeit bei Gruppen, Firmenanlässen und Feiern",
    ],
    profile: [
      "Erfahrung im Service von Vorteil",
      "Gute Deutschkenntnisse, weitere Sprachen willkommen",
      "Freundlich, aufmerksam und belastbar",
      "Bereitschaft für Abend- und Wochenendeinsätze",
    ],
  },
  {
    id: "service-bar",
    title: "Service- & Barmitarbeiter/in",
    pensum: "100 %",
    start: "ab sofort oder nach Vereinbarung",
    intro:
      "Du bist im Service genauso zuhause wie hinter der Bar: Caipirinha, Cocktails und Weinempfehlung gehören für dich dazu.",
    tasks: [
      "Service am Tisch und Betreuung der Gäste",
      "Zubereitung von Cocktails, Caipirinhas und Getränken",
      "Beratung zu Wein und Getränken",
      "Ordnung, Vorbereitung und Bestellungen an der Bar",
    ],
    profile: [
      "Erfahrung in Service und Bar",
      "Freude an Cocktails und guten Drinks",
      "Gute Deutschkenntnisse, weitere Sprachen willkommen",
      "Teamplayer/in, flexibel und zuverlässig",
    ],
  },
];

export const JOB_BENEFITS = [
  "Ein familiäres, motiviertes Team",
  "Ein neues Konzept mit Feuer und Leidenschaft",
  "Lohn nach L-GAV",
  "Personalessen",
];

export const WORK_PERMITS = ["Schweizer/in", "Ausweis C", "Ausweis B", "Ausweis G", "Ausweis L", "Andere"] as const;

/** CV upload: allowed types and the maximum size (the server limit for a request is ~4.5 MB). */
export const CV_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};
export const CV_MAX_BYTES = 3 * 1024 * 1024;
