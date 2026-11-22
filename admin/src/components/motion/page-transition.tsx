"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

/**
 * Section entrance: the page rises and fades in from a soft blur.
 * Rendered from the dashboard template, so it replays on every navigation.
 * Only this wrapper is animated: the page's own blocks may still be hydrating,
 * and styling them early would make React report a hydration mismatch.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(root.current, {
        autoAlpha: 0,
        y: 14,
        filter: "blur(4px)",
        duration: 0.55,
        ease: "power3.out",
        clearProps: "opacity,visibility,transform,filter",
      });
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
