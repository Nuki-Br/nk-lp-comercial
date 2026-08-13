import type {
  CalculatorLabels,
  ModuleDemoLabels,
  ModuleLabels,
  PricingLabels,
  RichText,
  SectionHead,
  TotalLabels,
} from "@/deck/types";

/* Toda string que um humano lê nos slides.

   Por que TUDO está aqui, inclusive o que o /admin da V1 nunca vai expor: a V2
   é sobrescrita de copy por proposta. Se o rótulo do logo do CasesSlide e os
   rótulos internos da Calculadora continuassem como literais dentro dos
   componentes, a V2 teria que reabrir os dez arquivos de slide. Uma passada
   agora, duas depois. Ver ADR 18.

   `RichText` como array de segmentos guarda a ênfase inline: `["texto ", { em:
   "destaque." }]` renderiza `texto <em>destaque.</em>`. Repare no ESPAÇO no fim
   do primeiro segmento — ele existe no DOM atual e some se você o aparar. */

/* ------------------------------------------------------------------ capa */

export const coverCopy = {
  kicker: "Apresentação comercial · 2026",
  title: ["Agora, a jornada completa — ", { em: "do custo à entrega." }] as RichText,
  /* Uma linha só de propósito. No JSX este texto estava quebrado em duas linhas
     e o JSX colapsa a quebra + indentação num único espaço; escrito aqui como
     duas linhas, sobraria a quebra literal e o DOM mudaria. */
  lead: "A Nuki organiza, profissionaliza e centraliza o ciclo completo de personalização de acabamentos — do planejamento de custo do memorial à validação em obra.",
  meta: { items: ["Planner", "Personaliza", "Inspetor"], separator: "·" },
  backLink: { href: "https://nukibr.com", ariaLabel: "Voltar para a home" },
};

/* -------------------------------------------------------------- cabeçalhos */

export const valueHead: SectionHead = {
  tag: "O valor da personalização",
  title: ["Personalizar não é custo. É ", { em: "margem, velocidade de venda e pauta ESG." }],
  lead: "O comprador já precifica a personalização na decisão de compra. Capturar esse valor — em vez de só absorver o custo — depende de processo.",
};

export const problemHead: SectionHead = {
  tag: "O problema",
  title: [
    "A personalização de unidades acontece hoje em três etapas — ",
    { em: "manuais e desconectadas." },
  ],
  lead: "Cada etapa tem sua própria dor. E todas viraram um custo invisível dentro da construtora: retrabalho, risco jurídico e insatisfação do cliente.",
};

export const whatIsNukiHead: SectionHead = {
  tag: "O que é a Nuki",
  title: [
    "A camada de gestão de todo o ciclo de personalização — ",
    { em: "em uma plataforma só." },
  ],
  lead: "A Nuki transforma um processo manual e fragmentado em um ciclo estruturado, integrado e escalável — da formação de custo do memorial à entrega validada em obra.",
};

export const differentiatorsHead: SectionHead = {
  tag: "Diferenciais",
  title: ["O que faz a Nuki ser ", { em: "a escolha certa." }],
  lead: "Seis pontos que separam a Nuki de qualquer solução parcial — ferramentas isoladas, planilhas ou build interno.",
};

export const audienceHead: SectionHead = {
  tag: "Pra quem serve",
  title: ["Feita pra quem gerencia personalização ", { em: "de verdade." }],
  lead: "Três personas dentro da construtora, cada uma com uma dor específica — e um objetivo comum: acabar com o retrabalho.",
};

export const casesHead: SectionHead = {
  tag: "Cases",
  title: ["Construtoras que já ", { em: "saíram da planilha." }],
  lead: "Construtoras que já organizaram o ciclo de personalização com a Nuki.",
};

export const pricingHead: SectionHead = {
  /* O único título com texto DEPOIS do `<em>` — o ponto final fica fora. É por
     isso que `RichText` é um array de segmentos e não um trio pre/em/post. */
  tag: "Plano & contato",
  title: ["Todos os módulos em ", { em: "um plano só" }, "."],
  lead: "Fee mensal por empreendimento ativo, com Planner, Personaliza e Inspetor inclusos desde o primeiro mês. Simule por quantos meses o empreendimento fica na plataforma.",
};

export const calculatorHead: SectionHead = {
  tag: "Estime o setup",
  title: ["Descubra quantas imagens seu empreendimento ", { em: "vai precisar." }],
  /* `<em>` no MEIO do parágrafo, com prosa dos dois lados — o caso que obriga
     `RichText` a ser uma lista de segmentos. */
  lead: [
    "Cada ambiente é modelado em 3D uma vez — dessa modelagem sai a ",
    { em: "imagem base" },
    ". As opções de acabamento são recortes de material sobre ela, e por isso custam bem menos. Escolha um ponto de partida e ajuste ambiente por ambiente.",
  ],
};

/** Sem `lead`: o frame de fechamento não tem um, e emitir um `<p class="lead">`
    vazio acrescentaria um elemento ao DOM. */
export const totalHead: SectionHead = {
  tag: "Total estimado",
  title: ["O investimento completo do seu ", { em: "empreendimento." }],
};

/* ------------------------------------------------------------------ cases */

export type CaseLogo = {
  name: string;
  file: string;
  width: number;
  height: number;
};

/** Assets vivem em /public/carrossel-logos/ (os mesmos do CarrosselLogos da
    home). A lista é local pra desacoplar as duas seções — se a home trocar a
    ordem/composição um dia, o deck não precisa acompanhar. */
export const caseLogos: CaseLogo[] = [
  { name: "Fibra", file: "/carrossel-logos/fibra-logo.png", width: 226, height: 30 },
  { name: "Patriani", file: "/carrossel-logos/patriani-logo.png", width: 226, height: 37 },
  { name: "Piemonte", file: "/carrossel-logos/piemonte-logo.png", width: 226, height: 48 },
  { name: "Mampei", file: "/carrossel-logos/mampei-logo.png", width: 200, height: 30 },
];

/* --------------------------------------------------------------- audience */

export const audienceLabels = { focus: "Foco", pain: "Dor típica" };
export const audienceFitTitle = "Quando a Nuki faz mais sentido";

/* ---------------------------------------------------------------- módulos */

export const moduleLabels: ModuleLabels = {
  featuresAriaTemplate: "Recursos do {strong}",
  beatTemplate: "Beat {n}",
  exploreTemplate: "Explorar o {strong}",
  exploreGlyph: "▷",
  externalGlyph: "↗",
  /* "Saiba mais" e a seta são DOIS nós: o texto e um `<span aria-hidden>`.
     Juntar num "Saiba mais →" só faria o leitor de tela anunciar a seta. */
  learnMore: "Saiba mais",
  learnMoreGlyph: "→",
};

/* Repare nas setas separadas do texto: no DOM cada uma é um
   `<span aria-hidden>` próprio, pra que o leitor de tela leia "Voltar" e não
   "seta-esquerda Voltar". Juntar num "← Voltar" mudaria o markup. */
export const moduleDemoLabels: ModuleDemoLabels = {
  back: "Voltar",
  backGlyph: "←",
  backAriaTemplate: "Voltar para {strong}",
  backTitle: "Voltar (←)",
  separator: "·",
  badge: "Demo interativa",
  forward: "Seguir",
  forwardGlyph: "→",
  forwardAria: "Seguir para a próxima seção",
  forwardTitle: "Seguir (→)",
  iframeTitleTemplate: "{strong} — demo interativa",
  loading: "Carregando demo…",
  activateHint: "Clique para interagir",
  activateGlyph: "▷",
  activateAriaTemplate: "Ativar a demo interativa do {strong}",
  mobileTitle: "Demo funciona melhor no desktop",
  mobileBodyTemplate:
    "O {strong} foi feito pra tela larga. No celular, abra em uma nova aba pra explorar com espaço.",
  mobileCta: "Abrir em nova aba →",
};

/* ---------------------------------------------------------------- pricing */

export const pricingLabels: PricingLabels = {
  cycleTabsAria: "Ciclo de cobrança",
  cycleHint:
    "O desconto acompanha o compromisso: a partir de 6 meses o Semestral entra sozinho, e a partir de 12 meses, o Anual.",
  priceSuffix: "/mês",
  priceUnit: "por empreendimento",
  monthsLabel: "Meses na plataforma",
  monthsAriaTemplate: "Meses no {plan}",
  emptySubtotal: "—",
};

/* ------------------------------------------------------------------ total */

export const totalLabels: TotalLabels = {
  cardAria: "Total estimado do empreendimento",
  imageSetup: "Setup de imagens",
  platform: "Plataforma",
  total: "Total",
  imagesHintTemplate: "{count} imagens estimadas",
  noMonthsHint: "configure os meses em Plano & contato",
  monthsHintTemplate: "{months} {unit} de operação Nuki",
  monthOne: "mês",
  monthOther: "meses",
};

/* ------------------------------------------------------------ calculadora */

export const calculatorLabels: CalculatorLabels = {
  admin: {
    dialogAria: "Configuração da apresentação",
    title: "Config apresentação",
    closeAria: "Fechar",
    closeGlyph: "×",
    basePriceLabel: "Valor da imagem base (R$)",
    optionPriceLabel: "Valor da imagem de opção (R$)",
    hint: "Ctrl+Alt+K abre/fecha · ESC fecha",
  },
  presets: { label: "Ponto de partida", groupAria: "Porte do empreendimento" },
  options: {
    dryLabel: "Opções por componente · secas",
    dryAria: "Opções por componente em áreas secas",
    wetLabel: "Opções por componente · molhadas",
    wetAria: "Opções por componente em áreas molhadas",
  },
  unitTypes: {
    tablistAria: "Metragens do empreendimento",
    /** `{n}` chega com zero à esquerda ("01"); o `padStart` é formatação e
        continua no componente. O aria-label vizinho NÃO é zero-padded. */
    tabTemplate: "Metragem {n}",
    removeTemplate: "Remover metragem {n}",
    removeGlyph: "×",
    addLabel: "+ Adicionar",
    addAria: "Adicionar metragem",
  },
  rooms: {
    heading: "Ambientes personalizáveis",
    addButton: "+ Adicionar ambiente",
    pickerAria: "Escolher ambiente",
    pickerPrompt: "Escolha um ambiente:",
    customOption: "+ Personalizado",
    cancel: "Cancelar",
    confirm: "Adicionar",
    formAria: "Adicionar ambiente personalizado",
    namePlaceholder: "Nome do ambiente (ex: Home Office)",
    classAria: "Classificação",
    classAriaTemplate: "Classificação: {areaType}",
    /* "Seca"/"Molhada" nas pills do formulário e "seca"/"molhada" na linha do
       ambiente e no chip do preset. Quatro entradas separadas de propósito:
       derivar uma da outra com toLowerCase mudaria o texto renderizado. */
    dryPill: "Seca",
    wetPill: "Molhada",
    dryTag: "seca",
    wetTag: "molhada",
    unitsLabel: "unidades",
    componentsLabel: "componentes",
    unitsAriaTemplate: "Unidades de {name}",
    /** "por", não "de" — os dois aria-labels vizinhos usam preposições
        diferentes, e uniformizar mudaria o DOM. */
    componentsAriaTemplate: "Componentes por {name}",
    removeTemplate: "Remover {name}",
    removeGlyph: "×",
  },
  variants: {
    label: "Variações desta metragem",
    groupAria: "Variações",
    impactedLabel: "Ambientes impactados nas variações",
    impactedHint:
      "Layout novo é modelagem nova: 1 unidade de cada ambiente marcado entra de novo na contagem por variação extra — com a imagem base dela e os componentes configurados acima.",
  },
  output: {
    countLabel: "imagens necessárias",
    mixTemplate: "{base} base · {option} de opção",
    costLabel: "setup de imagens estimado",
    disclaimerAria: "Aviso sobre a estimativa",
    disclaimerTitle: "Este valor é uma aproximação",
    disclaimerBody:
      "A estimativa serve como referência inicial pra dimensionar o setup do empreendimento. O valor oficial só é fechado quando são consideradas as particularidades reais do empreendimento e do catálogo de acabamentos.",
  },
  note: {
    unitTypeOne: "metragem",
    unitTypeOther: "metragens",
    scaleTemplate: "{count} {unit} · escala {dry}/{wet} opções por componente (secas/molhadas).",
    activeTemplate: "Metragem {n}: {total} imgs ({base} base · {option} de opção)",
    extraTemplate: ", sendo {extra} das variações",
  },
  cards: {
    groupAriaTemplate: "Editar Metragem {n}",
    indexTemplate: "Metragem {n}",
    imagesTemplate: "{count} imagens",
    variantTemplate: "Variação {n}",
    extraTag: "apenas ambientes impactados",
    extraPrefix: "+",
    variantImagesSuffix: "imgs",
    tileTitleTemplate: "{label}: {base} base + {option} de opção",
    emptyMain: "Nenhum ambiente adicionado. Suba as unidades acima.",
    emptyExtras: "Nenhum ambiente marcado como impactado.",
  },
};
