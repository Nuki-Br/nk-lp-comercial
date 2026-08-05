import {
  billingCycles,
  CUSTOM_ROOM_DEFAULTS,
  DEFAULT_ROOMS,
  differentiators,
  ESTIMATE_DEFAULTS,
  fitList,
  MAX_MONTHS,
  moduleFlow,
  PROJECT_SIZE_PRESETS,
  personas,
  plans,
  problemCards,
  ROOM_PRESETS,
  slideLabels,
} from "@/content/deck";
import { modules } from "@/content/modules";
import {
  audienceFitTitle,
  audienceHead,
  audienceLabels,
  calculatorHead,
  calculatorLabels,
  caseLogos,
  casesHead,
  coverCopy,
  differentiatorsHead,
  moduleDemoLabels,
  moduleLabels,
  pricingHead,
  pricingLabels,
  problemHead,
  totalHead,
  totalLabels,
  whatIsNukiHead,
} from "@/content/slides";
import { normalizeDeck } from "@/deck/resolve";
import type { DeckConfig, EstimateConfig, SlideNode } from "@/deck/types";

/** A configuração de estimativa, montada a partir dos defaults de conteúdo.

    `ESTIMATE_RANGES` NÃO entra: os clamps ficam em código porque são o que
    impede um erro de digitação no /admin de virar um orçamento absurdo, e não
    algo que um admin edita. Ver docs/estimate.md. */
function buildEstimateConfig(): EstimateConfig {
  return {
    plans,
    billingCycles,
    maxMonths: MAX_MONTHS,
    imagePrices: {
      base: ESTIMATE_DEFAULTS.baseImagePrice,
      option: ESTIMATE_DEFAULTS.optionImagePrice,
    },
    defaults: {
      dryOptions: ESTIMATE_DEFAULTS.dryOptions,
      wetOptions: ESTIMATE_DEFAULTS.wetOptions,
      unitTypes: ESTIMATE_DEFAULTS.initialUnitTypes,
    },
    projectSizePresets: [...PROJECT_SIZE_PRESETS],
    roomPresets: [...ROOM_PRESETS],
    customRoomDefaults: CUSTOM_ROOM_DEFAULTS,
    defaultRooms: [...DEFAULT_ROOMS],
  };
}

/** Um par de nós por módulo: o slide descritivo e, quando há `demoUrl`, o slide
    de demo logo depois — com `parentId` apontando pro módulo.

    A demo é um NÓ próprio e não um booleano porque precisa de id próprio: ela é
    navegável por seta, o tracking da etapa 2 chaveia pela âncora, e
    `DeckOverride.order` é chaveado por id. O "checkbox" que o deck-runtime.md
    pede vive no `SLIDE_META`, na camada de admin. */
function buildModuleNodes(): SlideNode[] {
  const out: SlideNode[] = [];

  for (const data of modules) {
    out.push({
      kind: "module",
      id: data.id,
      label: data.title.strong,
      enabled: true,
      ordinalGroup: "module",
      data,
      labels: moduleLabels,
    });

    if (data.demoUrl) {
      out.push({
        kind: "module-demo",
        id: `${data.id}-demo`,
        label: data.title.strong,
        enabled: true,
        parentId: data.id,
        // Navegável por seta, mas sem ponto próprio — toma emprestado o do pai.
        inNav: false,
        demoUrl: data.demoUrl,
        moduleName: data.title.strong,
        labels: moduleDemoLabels,
      });
    }
  }

  return out;
}

/**
 * O deck padrão: o que o `/fast` mostra e o ponto de partida de toda proposta.
 *
 * Devolve um config JÁ NORMALIZADO, de propósito — isso faz de `base` um ponto
 * fixo de `normalizeDeck`, e é o que torna `resolve(base, null) === base` uma
 * identidade em vez de uma coincidência.
 */
export function buildDefaultDeck(): DeckConfig {
  const slides: SlideNode[] = [
    {
      kind: "cover",
      id: "cover",
      label: slideLabels.cover,
      enabled: true,
      tone: "dark",
      ...coverCopy,
    },
    {
      kind: "problem",
      id: "problem",
      label: slideLabels.problem,
      enabled: true,
      head: problemHead,
      cards: problemCards,
    },
    {
      kind: "what-is-nuki",
      id: "what-is-nuki",
      label: slideLabels["what-is-nuki"],
      enabled: true,
      head: whatIsNukiHead,
      flow: moduleFlow,
    },
    ...buildModuleNodes(),
    /* Estes dois estão PRESENTES e DESABILITADOS, não ausentes — o commit
       e49dd8e os comentou fora da página enquanto o `deckNav` continuava
       listando os dois, e o nav renderizava dois pontos mortos. Modelados
       assim, `anchorsOf` os pula e os pontos somem como consequência da
       arquitetura. NÃO reative: esconder foi decisão de conteúdo. */
    {
      kind: "differentiators",
      id: "differentiators",
      label: slideLabels.differentiators,
      enabled: false,
      tone: "dark",
      head: differentiatorsHead,
      items: differentiators,
    },
    {
      kind: "audience",
      id: "audience",
      label: slideLabels.audience,
      enabled: false,
      head: audienceHead,
      personas,
      fit: { title: audienceFitTitle, items: fitList },
      labels: audienceLabels,
    },
    {
      kind: "cases",
      id: "cases",
      label: slideLabels.cases,
      enabled: true,
      head: casesHead,
      logos: caseLogos,
    },
    /* `pricing` ANTES de `calculator`, e `total` por último: o frame de
       fechamento lê o que os dois publicam. */
    {
      kind: "pricing",
      id: "pricing",
      label: slideLabels.pricing,
      enabled: true,
      tone: "dark",
      head: pricingHead,
      labels: pricingLabels,
    },
    {
      kind: "calculator",
      id: "calculator",
      label: slideLabels.calculator,
      enabled: true,
      head: calculatorHead,
      labels: calculatorLabels,
    },
    {
      kind: "total",
      id: "total",
      label: slideLabels.total,
      enabled: true,
      head: totalHead,
      labels: totalLabels,
    },
  ];

  return normalizeDeck({
    key: "fast",
    document: {
      title: "Nuki — Apresentação comercial",
      description:
        "Do planejamento do memorial à validação em obra — como a Nuki organiza, profissionaliza e centraliza o ciclo completo de personalização de acabamentos em uma plataforma só.",
    },
    slides,
    estimate: buildEstimateConfig(),
    chrome: {
      showFooter: true,
      keyboardHint: ["Use ", { kbd: "←" }, " ", { kbd: "→" }, " para navegar"],
      // `true` só aqui. O /p/[slug] resolve com `false` no ponto de render.
      allowPriceOverride: true,
    },
  });
}
