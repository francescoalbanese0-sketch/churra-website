/**
 * A single shared pointer-position tracker used by every EmberScene instance
 * on the page. Deliberately outside React: R3F's `useFrame` runs on its own
 * render loop, so reading a plain mutable object here avoids feeding 60fps
 * pointer updates through React state/re-renders anywhere on the page.
 *
 * The listener is attached once no matter how many scenes mount (Hero,
 * Ritual, Experience each render their own <Canvas>) and is never removed —
 * it's one passive window listener for the life of the tab, cheaper than
 * tearing down/re-adding per scene.
 */
export const pointerState = { x: 0, y: 0 };

let listening = false;

export function ensurePointerTracking() {
  if (listening || typeof window === "undefined") return;
  listening = true;

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerState.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerState.y = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
}
