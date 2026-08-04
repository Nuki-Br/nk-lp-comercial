"use client";

import { useEffect, useRef, useState } from "react";

/** Animação de contagem — parte do valor atualmente exibido (não do último
    target). Se o user mexer rápido, retoma de onde está, sem teleporte.
    Compartilhado entre Calculadora (imagens/custo) e CTA (meses/total). */
export function useCountUp(value: number, durationMs = 450): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}
