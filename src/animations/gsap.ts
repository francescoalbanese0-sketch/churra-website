import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Cinematic default ease across the site.
gsap.defaults({ ease: "power3.out" });

export { gsap, ScrollTrigger };
