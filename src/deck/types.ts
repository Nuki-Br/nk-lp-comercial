import type {
  CustomRoomDefaults,
  Differentiator,
  ModuleFlowStep,
  Persona,
  Plan,
  ProblemCard,
  ProjectSizePreset,
  RoomPreset,
} from "@/content/deck";
import type { ModuleData } from "@/content/modules";
import type { CaseLogo } from "@/content/slides";
import type { BillingCycle, RoomConfig, UnitTypeState } from "@/lib/estimateTypes";

export type { ProjectSizePreset, RoomPreset } from "@/content/deck";
/* Re-exportados pra que os componentes de slide tenham UM lugar de onde
   importar tipos. Um slide não pode importar de `src/content/` nem o tipo:
   a regra é "a config entra por prop", e um import de conteúdo — mesmo apagado
   no build — é o começo do caminho de volta pro acoplamento. */
export type { ModuleData, ModuleScreenshot } from "@/content/modules";
export type { RoomAreaType, RoomConfig, UnitTypeState } from "@/lib/estimateTypes";

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
    `lead` é opcional: o slide de total não tem um, e emitir um `<p>` vazio
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
  | "problem"
  | "what-is-nuki"
  | "module"
  | "module-demo"
  | "differentiators"
  | "audience"
  | "cases"
  | "pricing"
  | "calculator"
  | "total"
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
      retroativamente uma proposta já enviada. Mesmo argumento do
      docs/estimate.md pros presets. */
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

export type PricingLabels = {
  cycleTabsAria: string;
  cycleHint: string;
  priceSuffix: string;
  priceUnit: string;
  monthsLabel: string;
  monthsAriaTemplate: string;
  emptySubtotal: string;
};

export type PricingNode = SlideNodeBase & {
  kind: "pricing";
  head: SectionHead;
  labels: PricingLabels;
};

/** Rótulos da calculadora, agrupados por região da tela. Um saco plano de ~55
    chaves seria impossível de editar no /admin — e de revisar aqui. */
export type CalculatorLabels = {
  admin: {
    dialogAria: string;
    title: string;
    closeAria: string;
    closeGlyph: string;
    basePriceLabel: string;
    optionPriceLabel: string;
    hint: string;
  };
  presets: { label: string; groupAria: string };
  options: { dryLabel: string; dryAria: string; wetLabel: string; wetAria: string };
  unitTypes: {
    tablistAria: string;
    tabTemplate: string;
    removeTemplate: string;
    removeGlyph: string;
    addLabel: string;
    addAria: string;
  };
  rooms: {
    heading: string;
    addButton: string;
    pickerAria: string;
    pickerPrompt: string;
    customOption: string;
    cancel: string;
    confirm: string;
    formAria: string;
    namePlaceholder: string;
    classAria: string;
    classAriaTemplate: string;
    dryPill: string;
    wetPill: string;
    dryTag: string;
    wetTag: string;
    unitsLabel: string;
    componentsLabel: string;
    unitsAriaTemplate: string;
    componentsAriaTemplate: string;
    removeTemplate: string;
    removeGlyph: string;
  };
  variants: { label: string; groupAria: string; impactedLabel: string; impactedHint: string };
  output: {
    countLabel: string;
    mixTemplate: string;
    costLabel: string;
    disclaimerAria: string;
    disclaimerTitle: string;
    disclaimerBody: string;
  };
  note: {
    unitTypeOne: string;
    unitTypeOther: string;
    scaleTemplate: string;
    activeTemplate: string;
    extraTemplate: string;
  };
  cards: {
    groupAriaTemplate: string;
    indexTemplate: string;
    imagesTemplate: string;
    variantTemplate: string;
    extraTag: string;
    extraPrefix: string;
    variantImagesSuffix: string;
    tileTitleTemplate: string;
    emptyMain: string;
    emptyExtras: string;
  };
};

export type CalculatorNode = SlideNodeBase & {
  kind: "calculator";
  head: SectionHead;
  labels: CalculatorLabels;
};

export type TotalLabels = {
  cardAria: string;
  imageSetup: string;
  platform: string;
  total: string;
  imagesHintTemplate: string;
  noMonthsHint: string;
  monthsHintTemplate: string;
  monthOne: string;
  monthOther: string;
};

export type TotalNode = SlideNodeBase & {
  kind: "total";
  head: SectionHead;
  labels: TotalLabels;
};

/** V2. Presente na união pra que o registry tenha um braço `default` honesto. */
export type CustomNode = SlideNodeBase & { kind: "custom" };

export type SlideNode =
  | CoverNode
  | ProblemNode
  | WhatIsNukiNode
  | ModuleNode
  | ModuleDemoNode
  | DifferentiatorsNode
  | AudienceNode
  | CasesNode
  | PricingNode
  | CalculatorNode
  | TotalNode
  | CustomNode;

/* ------------------------------------------------------------------
   Configuração de estimativa
   ------------------------------------------------------------------ */

export type EstimateConfig = {
  plans: Plan[];
  billingCycles: BillingCycle[];
  /** Era `MAX_MONTHS`, constante de módulo do `PricingSlide`. */
  maxMonths: number;
  imagePrices: { base: number; option: number };
  defaults: {
    dryOptions: number;
    wetOptions: number;
    unitTypes: UnitTypeState[];
  };
  projectSizePresets: ProjectSizePreset[];
  roomPresets: RoomPreset[];
  customRoomDefaults: CustomRoomDefaults;
  /** Ambientes de partida de uma metragem nova. */
  defaultRooms: RoomConfig[];
};

/* ------------------------------------------------------------------
   O documento
   ------------------------------------------------------------------ */

export type DeckChrome = {
  showFooter: boolean;
  keyboardHint: RichText;
  /** Libera o painel `Ctrl+Alt+K` de preço.

      NÃO faz parte de `DeckOverride`, de propósito, e isso é uma decisão de
      segurança e não de estilo: `config_snapshot` guarda o config RESOLVIDO, e
      se este campo entrasse no delta, o `true` do /fast congelaria no snapshot
      e todo link publicado sairia com um painel que expõe custo-base. É
      decidido no ponto de render e nunca persistido. */
  allowPriceOverride: boolean;
};

export type DeckConfig = {
  /** `"fast"` ou o slug de uma proposta. */
  key: string;
  document: { title: string; description: string };
  /** A ordem do array É a ordem de render. */
  slides: SlideNode[];
  estimate: EstimateConfig;
  chrome: DeckChrome;
};
