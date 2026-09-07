/**
 * The single source of truth for how far the visitor has travelled through
 * the site's cinematic journey — written once by one global ScrollTrigger
 * (in CinematicWorld) and read every frame by the R3F camera rig. Kept as a
 * plain mutable object rather than React state for the same reason as
 * `pointerState`: R3F's render loop runs independently of React's, so
 * feeding 60fps scroll updates through `useState` would re-render the whole
 * app every frame for no benefit.
 */
export const journeyState = {
  /** 0 at the very top of the page, 1 at the very bottom. */
  progress: 0,
};
