"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

export function useScrollReveal(selector, options = {}) {
  const scopeRef = useRef(null);

  useGSAP(
    () => {
      gsap.from(selector, {
        y: 32,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: scopeRef.current,
          start: "top 80%",
        },
        ...options,
      });
    },
    { scope: scopeRef }
  );

  return scopeRef;
}
