import { Footer } from "@/components/layout/Footer";
import { DeckBehaviors, EstimateProvider, ProgressNav } from "@/components/deck";
import {
  AudienceSlide,
  CalculatorSlide,
  CasesSlide,
  CoverSlide,
  DifferentiatorsSlide,
  EstimatedTotalSlide,
  ModuleSlides,
  PricingSlide,
  ProblemSlide,
  WhatIsNukiSlide,
} from "@/components/slides";

export default function DeckPage() {
  return (
    <div className="jornada comercial flex min-h-screen flex-col">
      <ProgressNav />
      <main className="flex flex-1 flex-col">
        <CoverSlide />
        <ProblemSlide />
        <WhatIsNukiSlide />
        <ModuleSlides />
        <DifferentiatorsSlide />
        <AudienceSlide />
        <CasesSlide />
        {/* O provider engloba os três: o PricingSlide edita meses e ciclo, o
            CalculatorSlide publica imagens e custo, e o EstimatedTotalSlide
            (frame de fechamento) só lê os derivados. Evita prop drilling
            entre seções irmãs. */}
        <EstimateProvider>
          <PricingSlide />
          <CalculatorSlide />
          <EstimatedTotalSlide />
        </EstimateProvider>
      </main>
      <Footer />
      <DeckBehaviors />
      <div className="cm-hint" aria-hidden="true">
        Use <kbd>←</kbd> <kbd>→</kbd> para navegar
      </div>
    </div>
  );
}
