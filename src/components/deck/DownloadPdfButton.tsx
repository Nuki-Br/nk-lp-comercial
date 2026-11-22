"use client";

import { useEffect } from "react";

/**
 * Triggers the browser's native print dialog, whose "Save as PDF" destination
 * does the actual export — no PDF library, per Rule 3.
 *
 * `src/styles/print.css` turns every `.slide` into exactly one page box and
 * hides the chrome. What CSS alone cannot do is make a slide *fit* that box:
 * the sections were laid out for a viewport they could overflow, so the tall
 * ones (calculator) would crop. The pass below measures each slide at
 * the print box's width and writes a per-slide `--print-scale` the stylesheet
 * applies to `.slide-inner`.
 */

/* Mirrors of the `@page` box and `.slide` padding in print.css. Change these
   together with that file — nothing enforces the pairing at build time. */
const PAGE_HEIGHT_PX = 808;
const PAGE_BLEED_PX = 4;
const SLIDE_PAD_Y_PX = 48;
const AVAILABLE_HEIGHT_PX = PAGE_HEIGHT_PX - PAGE_BLEED_PX - SLIDE_PAD_Y_PX * 2;

/** Absorbs the rounding between the on-screen measurement and the real print
    layout — a slide measured at exactly the limit must not come out one pixel
    over it and lose a line to `overflow: hidden`. */
const SAFETY = 0.98;

/** Below this a slide is unreadable anyway; better to crop than to print a
    page nobody can read. Only reachable if a slide grows far past its design,
    which for the calculator means a lot of ambientes. */
const MIN_SCALE = 0.45;

/**
 * Measures every slide at print width and records how much it has to shrink.
 *
 * Runs synchronously: the class goes on, layout is forced by reading
 * `getBoundingClientRect`, the class comes off — all inside one task, so the
 * browser never paints the intermediate geometry and the reader sees no flash.
 *
 * The measurement is taken on screen, which is only faithful because the print
 * page is 1436px wide and therefore resolves the same media queries as any
 * viewport at or above the 1280px breakpoint. On a narrower screen the numbers
 * drift; `SAFETY` and `overflow: hidden` bound the damage.
 */
function fitSlidesToPages() {
  const root = document.documentElement;
  root.classList.add("is-print-fitting");
  try {
    const slides = document.querySelectorAll<HTMLElement>(".deck .slide");
    for (const slide of slides) {
      slide.style.removeProperty("--print-scale");
    }
    for (const slide of slides) {
      const inner = slide.querySelector<HTMLElement>(":scope > .slide-inner");
      if (!inner) continue;
      const height = inner.getBoundingClientRect().height;
      if (height <= AVAILABLE_HEIGHT_PX) continue;
      const scale = Math.max(MIN_SCALE, (AVAILABLE_HEIGHT_PX / height) * SAFETY);
      slide.style.setProperty("--print-scale", scale.toFixed(4));
    }
  } finally {
    root.classList.remove("is-print-fitting");
  }
}

export function DownloadPdfButton() {
  useEffect(() => {
    // `beforeprint` rather than the click handler: it covers Cmd+P and the
    // browser's own menu too, and `window.print()` fires it synchronously
    // before laying the pages out, which is exactly when the scales are needed.
    const measure = () => {
      fitSlidesToPages();
    };
    window.addEventListener("beforeprint", measure);
    return () => {
      window.removeEventListener("beforeprint", measure);
    };
  }, []);

  return (
    <button
      type="button"
      className="pdf-download"
      onClick={() => {
        window.print();
      }}
    >
      <span aria-hidden="true">⬇</span> Baixar PDF
    </button>
  );
}
