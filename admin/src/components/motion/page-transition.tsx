"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

/**
 * Section entrance: the page's blocks rise and fade in one after another.
 * Rendered from the dashboard template, so it replays on every navigation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const blocks = root.current ? Array.from(root.current.children) : [];
      gsap.from(blocks, {
        autoAlpha: 0,
        y: 18,
        filter: "blur(4px)",
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "opacity,visibility,transform,filter",
      });
      // Table rows and list items slide in after their block, like pages of a ledger turning.
      const rows = root.current?.querySelectorAll("[data-slot=table-body] > tr, [data-stagger] > li");
      if (rows?.length) {
        gsap.from(Array.from(rows).slice(0, 40), {
          autoAlpha: 0,
          x: -12,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.035,
          delay: 0.2,
          clearProps: "opacity,visibility,transform",
        });
      }
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
