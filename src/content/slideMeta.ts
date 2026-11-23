/* Rótulos pt-BR que o /admin mostra pra cada tipo de slide.

   Moram em `src/content/` e não junto do `SLIDE_META` em `src/deck/meta.ts`
   porque a tabela de camadas do AGENTS.md diz que `src/deck/` nunca guarda copy
   pt-BR. `meta.ts` importa daqui e monta o schema. */

export type SlideMetaCopy = { label: string; description: string };

export const slideMetaCopy: Record<string, SlideMetaCopy> = {
  cover: { label: "Capa", description: "Abertura com título, lead e os três módulos." },
  value: {
    label: "Por que personalizar",
    description: "A tese comercial: citação do comprador e cinco números com fonte.",
  },
  problem: { label: "O problema", description: "As três etapas manuais e a dor de cada uma." },
  "what-is-nuki": {
    label: "O que é a Nuki",
    description: "A plataforma como camada única de gestão do ciclo.",
  },
  module: {
    label: "Módulo",
    description: "Um módulo do produto, com beats, screenshots e destaques.",
  },
  "module-demo": {
    label: "Demo do módulo",
    description: "A demo interativa em iframe. Ligada/desligada pelo módulo pai.",
  },
  differentiators: {
    label: "Diferenciais",
    description: "Os seis pontos que separam a Nuki de uma solução parcial.",
  },
  audience: {
    label: "Pra quem serve",
    description: "As três personas na construtora e quando a Nuki faz sentido.",
  },
  cases: { label: "Cases", description: "Logos das construtoras já atendidas." },
  custom: { label: "Slide personalizado", description: "Reservado pra V2." },
};

/** Rótulos dos campos editáveis, por tipo de slide. */
export const fieldCopy = {
  tag: "Tag da seção",
  title: "Título",
  lead: "Texto de apoio",
  kicker: "Kicker",
  hasDemo: "Mostrar a demo interativa",
  logos: "Logos",
  personas: "Personas",
  fitTitle: "Título do bloco 'quando faz sentido'",
  fitItems: "Itens do bloco 'quando faz sentido'",
  cards: "Cards",
  evidence: "Números com fonte",
  flow: "Etapas do fluxo",
  items: "Itens",
} as const;
