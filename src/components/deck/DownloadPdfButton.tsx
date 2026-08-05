"use client";

/**
 * Triggers the browser's native print dialog, whose "Save as PDF" destination
 * does the actual export — no PDF library, per Rule 3. The `@media print`
 * block in deck.css is what makes the output usable: it hides this button and
 * the rest of the chrome, hides the inspector demo iframe entirely, and
 * forces `.reveal` visible so slides the visitor never scrolled to (and that
 * DeckBehaviors' IntersectionObserver therefore never revealed) still render.
 */
export function DownloadPdfButton() {
  return (
    <button type="button" className="pdf-download" onClick={() => window.print()}>
      <span aria-hidden="true">⬇</span> Baixar PDF
    </button>
  );
}
