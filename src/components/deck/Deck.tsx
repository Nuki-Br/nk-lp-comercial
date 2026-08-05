import { DeckBehaviors } from "@/components/deck/DeckBehaviors";
import { DeckNavigationProvider } from "@/components/deck/DeckNavigation";
import { DownloadPdfButton } from "@/components/deck/DownloadPdfButton";
import { EstimateProvider } from "@/components/deck/EstimateProvider";
import { ProgressNav } from "@/components/deck/ProgressNav";
import { Footer } from "@/components/layout/Footer";
import { RichText } from "@/components/ui/RichText";
import { anchorsOf, walkableIdsOf } from "@/deck/anchors";
import { renderSlide } from "@/deck/registry";
import type { DeckConfig } from "@/deck/types";

/**
 * Renderiza um `DeckConfig`. Um caminho de render só — o `/fast` e, na etapa 2,
 * o `/p/[slug]` passam por aqui; o que muda é o config, não o componente.
 *
 * O `EstimateProvider` envolve a lista INTEIRA em vez do trio Pricing +
 * Calculator + Total. Com ordem vinda de config não dá pra detectar o trio, e
 * envolver tudo é inofensivo e independente de ordem — ver docs/architecture.md.
 */
export function Deck({
  config,
  behaviors,
}: {
  config: DeckConfig;
  /**
   * Extra null-rendering behaviour, mounted inside the navigation provider.
   *
   * Exists so `/p/[slug]` can add `DeckTracking` without this file importing
   * it. That is a bundle boundary, not a style preference: an import here would
   * put the collector in the chunk `/fast` loads, and Rule 2's second test —
   * "is the collecting code reachable from /fast" — would fail even though it
   * never ran. `/fast` emits zero tracking requests because the code is not
   * there to emit them.
   */
  behaviors?: React.ReactNode;
}) {
  const anchors = anchorsOf(config.slides);
  const walkableIds = walkableIdsOf(config.slides);
  const ctx = { estimate: config.estimate, chrome: config.chrome };

  return (
    // Não emite nó de DOM — qualquer wrapper quebraria a identidade do `.deck`.
    <DeckNavigationProvider walkableIds={walkableIds}>
      <div className="deck flex min-h-screen flex-col">
        <ProgressNav anchors={anchors} />
        <main className="flex flex-1 flex-col">
          <EstimateProvider estimate={config.estimate}>
            {config.slides.map((node) => renderSlide(node, ctx))}
          </EstimateProvider>
        </main>
        {config.chrome.showFooter && <Footer />}
        <DeckBehaviors />
        {behaviors}
        <div className="keyboard-hint" aria-hidden="true">
          <RichText value={config.chrome.keyboardHint} />
        </div>
        <DownloadPdfButton />
      </div>
    </DeckNavigationProvider>
  );
}
