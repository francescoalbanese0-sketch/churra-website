/** Single source of truth for the restaurant's contact data, hours and prices. */

export const PHONE_DISPLAY = "+41 81 250 02 21";
export const PHONE_SHORT = "081 250 02 21";
export const PHONE_HREF = "tel:+41812500221";
export const EMAIL = "info@churra.ch";
export const EMAIL_HREF = "mailto:info@churra.ch";
export const MAPS_HREF = "https://www.google.com/maps/search/?api=1&query=Theaterweg+7+7000+Chur+Schweiz";

export const OPENING_LABEL = "Eröffnung am 23. Oktober 2026";

export const HOURS: { day: string; times: string[] }[] = [
  { day: "Montag", times: ["11:30–13:45"] },
  { day: "Dienstag", times: ["11:30–13:45", "18:00–22:30"] },
  { day: "Mittwoch", times: ["11:30–13:45", "18:00–22:30"] },
  { day: "Donnerstag", times: ["11:30–13:45", "18:00–22:30"] },
  { day: "Freitag", times: ["11:30–13:45", "18:00–23:00"] },
  { day: "Samstag", times: ["18:00–23:00"] },
  { day: "Sonntag", times: ["12:00–15:00", "17:00–21:30"] },
];
