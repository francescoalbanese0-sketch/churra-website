export interface Waypoint {
  label: string;
  /** Roughly where this beat sits along the whole page, 0–1. Doesn't need
   *  to be exact — the camera eases continuously between waypoints and
   *  neighbours blend into each other, so what matters is relative order
   *  and rough pacing, not pixel-perfect alignment with any one section. */
  at: number;
  /** Ember colour for this beat. */
  color: string;
  /** Particle density, 0–1 (scaled against a shared base count). */
  density: number;
  /** Point-light warmth at this beat. */
  lightColor: string;
  lightIntensity: number;
  /** How tightly the embers cluster — small = tight/climactic and close to
   *  the "lens", large = diffuse and distant. */
  spread: number;
}

/**
 * The 13 beats of the journey the brief asks for, translated into a path
 * through 3D space: DARKNESS → EMBERS → FIRE (the hero) → KITCHEN → CHARCOAL
 * (Die Verwandlung's grill photography) → PICANHA (the ritual's climax) →
 * CLOSE-UP → ROASTING → CUTTING → SERVING (the churrasco-erlebnis sequence)
 * → TABLE → RESTAURANT (the commercial moment) → RESERVATION (the calm
 * close). Each beat is a small cluster of embers + a point light positioned
 * along -Z; the camera dollies through all of them in one continuous move
 * tied to total page scroll, and only the 1–2 beats nearest the camera at
 * any moment are actually visible (see the falloff logic in CinematicWorld)
 * — the rest sit dormant in the fog behind or ahead of it.
 */
export const WAYPOINTS: Waypoint[] = [
  { label: "Darkness", at: 0.0, color: "#3a2416", density: 0.04, lightColor: "#3a2416", lightIntensity: 0.05, spread: 5 },
  { label: "Embers", at: 0.03, color: "#ff8a3c", density: 0.22, lightColor: "#ff7a30", lightIntensity: 0.3, spread: 4.5 },
  { label: "Fire", at: 0.06, color: "#ff7a30", density: 0.85, lightColor: "#ff6a2b", lightIntensity: 1, spread: 3.5 },
  { label: "Kitchen", at: 0.1, color: "#8a7460", density: 0.3, lightColor: "#c9a15a", lightIntensity: 0.35, spread: 5.5 },
  { label: "Charcoal", at: 0.15, color: "#ff5a1f", density: 0.65, lightColor: "#ff4d18", lightIntensity: 0.8, spread: 3 },
  { label: "Picanha", at: 0.28, color: "#ffb066", density: 1, lightColor: "#ff8a3c", lightIntensity: 1.2, spread: 2.2 },
  { label: "Close-up", at: 0.34, color: "#ffcf94", density: 0.55, lightColor: "#ffb066", lightIntensity: 1.05, spread: 1.6 },
  { label: "Roasting", at: 0.46, color: "#e7a95a", density: 0.5, lightColor: "#e7a95a", lightIntensity: 0.6, spread: 4 },
  { label: "Cutting", at: 0.6, color: "#d8c39a", density: 0.28, lightColor: "#c9a15a", lightIntensity: 0.45, spread: 4.5 },
  { label: "Serving", at: 0.7, color: "#e7c98a", density: 0.24, lightColor: "#c9a15a", lightIntensity: 0.4, spread: 5 },
  { label: "Table", at: 0.8, color: "#ede4d3", density: 0.16, lightColor: "#c9a15a", lightIntensity: 0.32, spread: 6 },
  { label: "Restaurant", at: 0.87, color: "#ede4d3", density: 0.14, lightColor: "#c9a15a", lightIntensity: 0.28, spread: 6 },
  { label: "Reservation", at: 0.96, color: "#c9a15a", density: 0.08, lightColor: "#c9a15a", lightIntensity: 0.18, spread: 6 },
];

/** Total world-units the camera travels, z from 0 to -JOURNEY_DEPTH. */
export const JOURNEY_DEPTH = 240;
