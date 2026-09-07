import { Component, type ReactNode } from "react";

/**
 * A small error boundary around a WebGL canvas: on a device/browser without
 * usable WebGL, `@react-three/fiber` throws during mount. Rather than take
 * the whole page down with it, this swallows the error and renders nothing
 * — the photography and video behind/around it already carry the scene
 * without whatever atmosphere layer failed to start. Shared by every R3F
 * mount on the site (EmberScene, CinematicWorld).
 */
export class CanvasGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
