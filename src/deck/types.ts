import type {
  Differentiator,
  ModuleFlowStep,
  Persona,
  ProblemCard,
  ValueEvidence,
  ValueQuote,
} from "@/content/deck";
import type { ModuleData } from "@/content/modules";
import type { CaseLogo } from "@/content/slides";

/* Re-exportados pra que os componentes de slide tenham UM lugar de onde
   importar tipos. Um slide não pode importar de `src/content/` nem o tipo:
   a regra é "a config entra por prop", e um import de conteúdo — mesmo apagado
   no build — é o começo do caminho de volta pro acoplamento. */
export type { ModuleData, ModuleScreenshot } from "@/content/modules";

/* O contrato entre as três etapas da construção.

   REGRA DURA: tudo aqui tem que sobreviver a `JSON.parse(JSON.stringify(x))`
   deep-equal. Sem funções, sem `Date`, sem `Map`, sem `undefined` explícito —
   `JSON.stringify` descarta chaves com valor `undefined`, então um campo
   opcional é OMITIDO, nunca setado como `undefined`. Há teste pra isso.

   Este módulo é livre de React de propósito: o /admin, o validador e a DAL
   importam os tipos sem puxar um único componente de slide pro bundle deles. */

/* ------------------------------------------------------------------
   Texto com ênfase inline
   ------------------------------------------------------------------ */

/** Um pedaço de texto. `{ em }` vira `<em>` (o laranja Nuki), `{ kbd }` vira
    `<kbd>`. String pura é texto puro. */
export type RichSpan = string | { em: string } | { kbd: string };

/** Uma string legível que pode conter ênfase inline.

    Existe porque nove títulos de slide embutem um `<em>` no meio da frase, e o
    atalho de teclado embute dois `<kbd>`. Guardar isso como HTML numa string
    exigiria confiar em HTML vindo do banco na etapa 2; um array de segmentos é
    dado, não markup, e sobrevive ao JSONB sem `dangerouslySetInnerHTML`. */
export type RichText = string | RichSpan[];

/** O cabeçalho `.section-head` — tag / h2 / lead — que oito slides repetem.
    `lead` é opcional: um cabeçalho pode vir sem ele, e emitir um `<p>` vazio
    mudaria o DOM. */
export type SectionHead = {
  tag: string;
  title: RichText;
  lead?: RichText;
};

/* ------------------------------------------------------------------
   Nós de slide
   ------------------------------------------------------------------ */

export type SlideKind =
  | "cover"
  | "value"
  | "problem"
  | "what-is-nuki"
  | "module"
  | "module-demo"
  | "differentiators"
  | "audience"
  | "cases"
  /** V2: slides sob medida por cliente. TIPADO agora, construído depois — o
      braço `default` do registry devolve `null` em vez de estourar, pra que um
      config escrito por um deploy mais novo degrade em vez de derrubar um
      pitch ao vivo. Ver ADR 18. */
  | "custom";

/** Os campos que qualquer consumidor pode ler SEM olhar o `kind`.

    É o que mantém a promessa do `deck-runtime.md`: nada fora do registry dá
    switch em `kind`. `anchorsOf`, `walkableIdsOf` e `normalizeDeck` operam só
    sobre esta base. */
export type SlideNodeBase = {
  /** Âncora E id de nav. Único no deck inteiro. */
  id: string;
  /** Rótulo do ponto no progress-nav. */
  label: string;
  /** `false` = não renderiza, não tem ponto, não entra na navegação por seta. */
  enabled: boolean;
  /** OMITIDO quando claro. Nunca escreva `"light"`: `data-tone={node.tone}` com
      `undefined` não emite o atributo, e emitir `data-tone="light"` acrescenta
      um atributo em oito seções. */
  tone?: "dark";
  /** default `true`. `false` no slide de demo, que é navegável mas não tem ponto. */
  inNav?: boolean;
  /** default `true`. */
  walkable?: boolean;
  /** DERIVADO por `normalizeDeck`: o ponto que este nó toma emprestado. */
  navId?: string;
  /** AUTORADO: este nó morre se o pai sumir ou for desabilitado. */
  parentId?: string;
  /** DERIVADO por `normalizeDeck`: id do filho sobrevivente, ou chave ausente. */
  childId?: string;
  /** AUTORADO: grupo de numeração ordinal (hoje só `"module"`). */
  ordinalGroup?: string;
  /** DERIVADO por `normalizeDeck`: posição 1..N dentro do `ordinalGroup`. */
  ordinal?: number;
  /** V2: sobrescritas de copy por nó. Tipado, nunca lido na V1. */
  copy?: Record<string, unknown>;
};

export type CoverNode = SlideNodeBase & {
  kind: "cover";
  kicker: string;
  title: RichText;
  lead: RichText;
  meta: { items: string[]; separator: string };
  backLink: { href: string; ariaLabel: string };
};

export type ValueNode = SlideNodeBase & {
  kind: "value";
  head: SectionHead;
  quote: ValueQuote;
  evidence: ValueEvidence[];
};

export type ProblemNode = SlideNodeBase & {
  kind: "problem";
  head: SectionHead;
  cards: ProblemCard[];
};

export type WhatIsNukiNode = SlideNodeBase & {
  kind: "what-is-nuki";
  head: SectionHead;
  flow: ModuleFlowStep[];
};

/** Rótulos do slide de módulo. `{strong}` é substituído pelo nome do módulo. */
export type ModuleLabels = {
  featuresAriaTemplate: string;
  beatTemplate: string;
  exploreTemplate: string;
  exploreGlyph: string;
  externalGlyph: string;
  learnMore: string;
  learnMoreGlyph: string;
};

export type ModuleNode = SlideNodeBase & {
  kind: "module";
  /** `ModuleData` INTEIRO, não uma chave. Um `{ moduleKey: "inspetor" }` ficaria
      mais bonito e estaria errado: o snapshot publicado tem que congelar o
      documento do cliente, e uma referência deixaria uma edição de copy mudar
      retroativamente uma proposta já enviada. */
  data: ModuleData;
  labels: ModuleLabels;
};

export type ModuleDemoLabels = {
  back: string;
  backGlyph: string;
  backAriaTemplate: string;
  backTitle: string;
  separator: string;
  badge: string;
  forward: string;
  forwardGlyph: string;
  forwardAria: string;
  forwardTitle: string;
  iframeTitleTemplate: string;
  loading: string;
  activateHint: string;
  activateGlyph: string;
  activateAriaTemplate: string;
  mobileTitle: string;
  mobileBodyTemplate: string;
  mobileCta: string;
};

export type ModuleDemoNode = SlideNodeBase & {
  kind: "module-demo";
  demoUrl: string;
  /** `title.strong` do módulo pai, congelado nos templates de rótulo. */
  moduleName: string;
  labels: ModuleDemoLabels;
};

export type DifferentiatorsNode = SlideNodeBase & {
  kind: "differentiators";
  head: SectionHead;
  items: Differentiator[];
};

export type AudienceNode = SlideNodeBase & {
  kind: "audience";
  head: SectionHead;
  personas: Persona[];
  fit: { title: string; items: string[] };
  labels: { focus: string; pain: string };
};

export type CasesNode = SlideNodeBase & {
  kind: "cases";
  head: SectionHead;
  logos: CaseLogo[];
};

/** V2. Presente na união pra que o registry tenha um braço `default` honesto. */
export type CustomNode = SlideNodeBase & { kind: "custom" };

export type SlideNode =
  | CoverNode
  | ProblemNode
  | ValueNode
  | WhatIsNukiNode
  | ModuleNode
  | ModuleDemoNode
  | DifferentiatorsNode
  | AudienceNode
  | CasesNode
  | CustomNode;

/* ------------------------------------------------------------------
   O documento
   ------------------------------------------------------------------ */

export type DeckChrome = {
  showFooter: boolean;
  keyboardHint: RichText;
};

export type DeckConfig = {
  /** `"fast"` ou o slug de uma proposta. */
  key: string;
  document: { title: string; description: string };
  /** A ordem do array É a ordem de render. */
  slides: SlideNode[];
  chrome: DeckChrome;
};
