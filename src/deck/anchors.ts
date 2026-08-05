import type { SlideNode } from "@/deck/types";

/* Todas as projeções que a chrome do deck precisa da lista de slides.

   NENHUMA delas olha `kind`. É isso que mantém a promessa do deck-runtime.md:
   só o registry dá switch em `kind`. Um slide entra ou sai do nav e da caminhada
   por seta através de `inNav` / `walkable` na base do nó, não por tipo. */

export type Anchor = { id: string; label: string };

/** Slides que de fato renderizam. */
export const visibleSlides = (slides: SlideNode[]): SlideNode[] => slides.filter((n) => n.enabled);

/** Os pontinhos do progress-nav, na ordem de render.

    Nós desabilitados somem daqui — é o que faz os dois pontos mortos de
    `differentiators` e `audience` desaparecerem como CONSEQUÊNCIA da
    arquitetura, sem nenhuma linha dizendo "remova estes dois". */
export const anchorsOf = (slides: SlideNode[]): Anchor[] =>
  slides.filter((n) => n.enabled && n.inNav !== false).map((n) => ({ id: n.id, label: n.label }));

/** A lista que as setas ← → percorrem.

    Inclui o slide de demo, que é navegável mas não tem ponto próprio. Antes era
    derivada do DOM com `querySelectorAll(".slide, .module")` em DOIS lugares
    (`DeckBehaviors` e `ModuleDemoSlide.navigate`), que iam divergir no primeiro
    `.slide` sem `id`. Agora a ordem é autoritativa em vez de incidental. */
export const walkableIdsOf = (slides: SlideNode[]): string[] =>
  slides.filter((n) => n.enabled && n.walkable !== false).map((n) => n.id);
