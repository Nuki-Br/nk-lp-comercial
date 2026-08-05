"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

/**
 * Publica a lista de âncoras navegáveis, derivada do `DeckConfig`.
 *
 * Antes ela era derivada do DOM com `querySelectorAll(".slide, .module")` em
 * DOIS lugares — `DeckBehaviors` e `ModuleDemoSlide.navigate` — que iam divergir
 * no primeiro `.slide` sem `id`. Agora a ordem é autoritativa em vez de
 * incidental, um slide pode sair da caminhada sem gambiarra no DOM, e o seletor
 * morto `.module` deixa de ser consultado.
 *
 * O valor exposto é uma FUNÇÃO estável, não o array. Um array mudaria de
 * identidade a cada render e convidaria um consumidor a colocá-lo num array de
 * dependências — que é exatamente o que quebraria a garantia de
 * `useEffect(…, [])` do `DeckBehaviors`.
 *
 * Não renderiza nenhum nó de DOM: qualquer wrapper quebraria a identidade do
 * `.deck` que esta etapa precisa provar.
 */
type DeckNavigationValue = { getWalkableIds: () => string[] };

const DeckNavigationContext = createContext<DeckNavigationValue>({ getWalkableIds: () => [] });

export function DeckNavigationProvider({
  walkableIds,
  children,
}: {
  walkableIds: string[];
  children: ReactNode;
}) {
  const idsRef = useRef(walkableIds);
  useEffect(() => {
    idsRef.current = walkableIds;
  }, [walkableIds]);

  /* `useState` com inicializador, não `useRef`: o valor é criado UMA vez e sua
     identidade nunca muda (é isso que mantém o efeito do DeckBehaviors montando
     uma vez só), mas ler estado durante o render é legal — ler `ref.current`
     durante o render não é, e o `react-hooks` do Next reprova. */
  const [value] = useState<DeckNavigationValue>(() => ({
    getWalkableIds: () => idsRef.current,
  }));

  return <DeckNavigationContext.Provider value={value}>{children}</DeckNavigationContext.Provider>;
}

export const useDeckNavigation = () => useContext(DeckNavigationContext);
