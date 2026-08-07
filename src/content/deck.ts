/* Conteúdo da apresentação comercial Nuki.
   Rascunhos baseados em (a) PPT "Migração do Modelo de Precificação" (slides 1-13)
   e (b) contexto-de-produto-v2.md (§§ 1-12). Copy pode ser refinado pelo user;
   estrutura das seções serve como base. */

import {
  type BillingCycle,
  materializeRooms,
  type RoomAreaType,
  type RoomConfig,
  type RoomWeight,
  type UnitTypeState,
} from "@/lib/estimateTypes";

/** Rótulo do ponto de cada seção no progress-nav, indexado pelo id da âncora.

    Módulos não aparecem: o rótulo deles é o `title.strong` de `modules.ts`. */
export const slideLabels: Record<string, string> = {
  cover: "Capa",
  problem: "O problema",
  "what-is-nuki": "O que é a Nuki",
  differentiators: "Diferenciais",
  audience: "Pra quem serve",
  cases: "Cases",
  pricing: "Plano & contato",
  calculator: "Estime o setup",
  total: "Total estimado",
};

/** A ordem+rótulos que o `ProgressNav` ainda consome diretamente.

    TRANSITÓRIO: `buildDefaultDeck()` passa a ser dono da ordem, e o `ProgressNav`
    passa a receber `anchorsOf(config.slides)` por prop — aí este array sai e
    `slideLabels` acima fica sendo a única fonte dos rótulos. Enquanto os dois
    coexistem, `slideLabels` é a fonte de verdade dos textos; a ordem aqui tem
    que bater com a do DOM ou os pontinhos andam pra trás. */
export const deckNav = [
  { id: "cover", label: slideLabels.cover },
  { id: "problem", label: slideLabels.problem },
  { id: "what-is-nuki", label: slideLabels["what-is-nuki"] },
  { id: "planner", label: "Planner" },
  { id: "personaliza", label: "Personaliza" },
  { id: "inspetor", label: "Inspetor" },
  { id: "differentiators", label: slideLabels.differentiators },
  { id: "audience", label: slideLabels.audience },
  { id: "cases", label: slideLabels.cases },
  { id: "pricing", label: slideLabels.pricing },
  { id: "calculator", label: slideLabels.calculator },
  { id: "total", label: slideLabels.total },
];

export type ProblemCard = {
  step: string;
  title: string;
  description: string;
  pain: string;
};

export const problemCards: ProblemCard[] = [
  {
    step: "Etapa 01",
    title: "Planejamento",
    description:
      "Antes da venda, a construtora monta o memorial: catálogo, opções por tipologia, custos e preços. Hoje isso vive em planilhas com múltiplas versões por e-mail, com dados entrando na plataforma só ao final.",
    pain: "Processo consome 3 a 4 meses, com alto risco de erro e retrabalho.",
  },
  {
    step: "Etapa 02",
    title: "Atendimento",
    description:
      "Com o memorial pronto, o cliente escolhe seus acabamentos. Sem plataforma, isso acontece por planilhas, PDFs e e-mails, com troca manual entre pós-venda, engenharia e compras.",
    pain: "Erros de interpretação, falta de rastreabilidade e risco jurídico.",
  },
  {
    step: "Etapa 03",
    title: "Vistoria em obra",
    description:
      "Depois de executado, alguém confere se o que foi personalizado foi entregue. Prancheta, foto solta no celular e WhatsApp com a obra.",
    pain: "Problema encontrado na vistoria com o cliente custa muito mais para corrigir.",
  },
];

export type ModuleFlowStep = {
  phase: string;
  name: string;
  description: string;
};

export const moduleFlow: ModuleFlowStep[] = [
  {
    phase: "Antes da venda",
    name: "Planner",
    description: "Planejamento e formação de custo do memorial de personalização.",
  },
  {
    phase: "Durante a venda",
    name: "Personaliza",
    description: "Atendimento ao cliente e gestão das escolhas de acabamento.",
  },
  {
    phase: "Após a execução",
    name: "Inspetor",
    description: "Validação do que foi executado vs. o que foi personalizado pelo cliente.",
  },
];

export type Differentiator = {
  n: string;
  title: string;
  description: string;
};

export const differentiators: Differentiator[] = [
  {
    n: "01",
    title: "Cobertura do ciclo completo",
    description:
      "A única plataforma que conecta planejamento, atendimento e vistoria em obra — do custo à entrega.",
  },
  {
    n: "02",
    title: "Integração nativa entre módulos",
    description:
      "Os dados fluem automaticamente entre fases. Publicou no Planner, alimentou o Personaliza. Escolheu no Personaliza, virou checklist no Inspetor.",
  },
  {
    n: "03",
    title: "Flexibilidade sem perder estrutura",
    description:
      "Fórmulas de preço livres, catálogo customizável, fluxo adaptável ao porte da construtora — sem modelo imposto.",
  },
  {
    n: "04",
    title: "Feito pra realidade de obra",
    description:
      "O Inspetor funciona offline, com foco em velocidade e captura fotográfica no campo. Sincroniza sozinho ao voltar o sinal.",
  },
  {
    n: "05",
    title: "Rastreabilidade e segurança jurídica",
    description:
      "Cada decisão, custo, escolha e inspeção fica registrada com data, responsável e histórico. Em disputa, você tem a prova.",
  },
  {
    n: "06",
    title: "Escalabilidade operacional",
    description:
      "Processo estruturado que cresce com o volume de empreendimentos, sem aumentar headcount na mesma proporção.",
  },
];

export type Persona = {
  role: string;
  name: string;
  foco: string;
  pain: string;
};

export const personas: Persona[] = [
  {
    role: "Persona 01",
    name: "Coordenadora de Personalização",
    foco: "Organização e controle do processo, redução de retrabalho, visibilidade em tempo real do andamento das unidades.",
    pain: "Processos manuais sem padronização, falta de rastreabilidade das escolhas, pressão da obra e da diretoria.",
  },
  {
    role: "Persona 02",
    name: "Diretor / CEO",
    foco: "Eficiência operacional e margem, diferenciação de mercado, escalabilidade sem aumento de headcount, governança e redução de risco.",
    pain: "Retrabalho invisível que come margem, disputas jurídicas, tecnologia como vantagem competitiva ainda não capturada.",
  },
  {
    role: "Persona 03",
    name: "Supervisor de Obra",
    foco: "Clareza sobre o que precisa ser corrigido, documentação que sustenta decisões técnicas, comunicação limpa com o pós-venda.",
    pain: "Recebe comunicados vagos sobre o que corrigir, sem registro formal do que foi aprovado ou rejeitado.",
  },
];

export const fitList = [
  "Múltiplos empreendimentos ou torres simultâneas com personalização",
  "Retrabalho entre planejamento, pós-venda, engenharia e obra",
  "Objetivo de profissionalizar o atendimento ao cliente na etapa de personalização",
  "Necessidade de rastreabilidade e segurança jurídica no processo",
  "Escalar volume de empreendimentos sem aumentar headcount operacional",
];

/* ============================================================
   Calculadora "Estime o setup"

   Hierarquia: empreendimento → metragens (1-3) → variações (1-3).
   Cada metragem tem uma lista de ambientes editável. Por default vem
   com Quartos + Banheiros; o user adiciona ambientes custom via
   "+ Adicionar ambiente" (nome + classificação seca/molhada).

   Duas tarifas, porque a produção tem duas etapas:
     - imagem BASE: o render do ambiente modelado em 3D. Uma por unidade de
       ambiente (2 quartos = 2 modelagens). É a cara.
     - imagem de OPÇÃO: recorte de material/acabamento sobre a base. Barata.

   Cálculo por ambiente:
     base   = ambiente.quantidade × BASE_IMAGES_PER_ROOM_UNIT
     opção  = ambiente.quantidade × ambiente.componentes × opcoes[classe]
   Onde opcoes[classe] vem dos inputs globais de "Opções por componente"
   separados em secas vs molhadas.

   Referência histórica dos números do orçamento Tecer/Manawa (R01, 27/06/2026)
   quando as unidades assumiam 3 opções por componente:
     Sala 10 · Dorm 10 · Escrit 10 · Cozinha 19 · Lavabo 20 · Banho 23
     Área de Serviço 17 · Terraço 18
   Não é mais fonte primária — serve só de sanity check pros defaults.
   ============================================================ */

/* Os tipos e os clamps moram em `src/lib/estimateTypes.ts` — camada pura, pra
   que `src/lib/estimate.ts` não precise importar de `content/` (seta invertida)
   e pra que `CalculatorSlide` possa ler `ESTIMATE_RANGES` sem importar daqui.
   Re-exportados pra que os consumidores de conteúdo continuem tendo um import só. */
export type {
  ImpactedRooms,
  RoomAreaType,
  RoomConfig,
  RoomWeight,
  UnitTypeState,
} from "@/lib/estimateTypes";
export { BASE_IMAGES_PER_ROOM_UNIT, ESTIMATE_RANGES } from "@/lib/estimateTypes";

/** Ambientes com que toda metragem começa. Só Quartos + Banheiros — o
    resto o user adiciona via "+ Adicionar ambiente" digitando nome e
    escolhendo seca/molhada.

    DADO, não factory: precisa sobreviver ao round-trip JSON do `DeckConfig`.
    Quem usa clona com `materializeRooms()`. */
export const DEFAULT_ROOMS: readonly RoomConfig[] = [
  {
    id: "quartos",
    name: "Quartos",
    areaType: "dry",
    weight: "light",
    units: 2,
    components: 3,
    locked: true,
  },
  {
    id: "banheiros",
    name: "Banheiros",
    areaType: "wet",
    weight: "heavy",
    units: 1,
    components: 8,
    locked: true,
  },
];

/** Defaults aplicados a ambientes custom criados via "+ Adicionar". */
export type CustomRoomDefaults = {
  weight: RoomWeight;
  units: number;
  components: number;
};

export const CUSTOM_ROOM_DEFAULTS: CustomRoomDefaults = {
  weight: "medium",
  units: 1,
  components: 4,
};

/** Presets rápidos exibidos como chips no "+ Adicionar ambiente". Clicar num
    chip adiciona o ambient com nome + classe pré-preenchidos + defaults de
    peso/quantidade/componentes (via CUSTOM_AMBIENTE_DEFAULTS) — user pode
    editar depois nos controles do tile. Bate com a lista histórica de
    referência: Sala/Cozinha/Lavabo/Área de Serviço/Terraço. Cobre 3 molhadas +
    2 secas — as combinações mais comuns em apto residencial. */
export type RoomPreset = {
  name: string;
  areaType: RoomAreaType;
};

export const ROOM_PRESETS: readonly RoomPreset[] = [
  { name: "Sala", areaType: "dry" },
  { name: "Lavabo", areaType: "wet" },
  { name: "Cozinha", areaType: "wet" },
  { name: "Área de Serviço", areaType: "wet" },
  { name: "Terraço", areaType: "dry" },
];

/* ------------------------------------------------------------------
   Presets de porte do empreendimento

   Ponto de partida rápido numa reunião: um clique substitui o estado
   inteiro da calculadora (metragens, ambientes, variações e opções por
   componente) e o vendedor customiza a partir dali. Diferente de
   ROOM_PRESETS, que adiciona um ambiente avulso à metragem ativa.
   ------------------------------------------------------------------ */

export type ProjectSizePreset = {
  id: string;
  /** rótulo no chip */
  name: string;
  /** sublabel estrutural. Nunca um total de imagens: ele muda junto com as
      opções por componente e desatualizaria sozinho. */
  hint: string;
  dryOptions: number;
  wetOptions: number;
  /** DADO, não factory — tem que sobreviver ao round-trip JSON do `DeckConfig`.
      Traz ids 1..N; a Calculadora reposiciona o contador de ids em cima disso
      pra não colidir no "+ Adicionar" seguinte, e clona com
      `materializeUnitTypes()` antes de aplicar. */
  unitTypes: UnitTypeState[];
};

/** Ambientes de preset são removíveis (sem `locked`) e repetições viram
    `units` em vez de linhas separadas: "Quartos ×3", não "Quarto 01/02/03".
    A contagem de imagens é a mesma, mas o painel esquerdo fica legível numa
    reunião. O peso sai da contagem de componentes, que é o que o tile está de
    fato representando: ≤3 leve, 4-6 médio, 7+ pesado. */
const room = (
  id: string,
  name: string,
  areaType: RoomAreaType,
  components: number,
  units = 1,
): RoomConfig => ({
  id,
  name,
  areaType,
  weight: components <= 3 ? "light" : components <= 6 ? "medium" : "heavy",
  units,
  components,
});

/* Componentes por ambiente derivados da referência Tecer/Manawa do topo deste
   bloco (contagem de imagens a 3 opções ÷ 3). Hall Privativo e Cozinha/Sala
   integrada não estão na referência — são estimativas. */
const studioRooms = (): RoomConfig[] => [
  room("cozinha-sala", "Cozinha/Sala", "wet", 8),
  room("quarto", "Quarto", "dry", 3),
  room("banheiro", "Banheiro", "wet", 8),
  room("area-de-servico", "Área de Serviço", "wet", 6),
  room("terraco", "Terraço", "dry", 6),
];

const standardRooms = (): RoomConfig[] => [
  room("cozinha", "Cozinha", "wet", 6),
  room("sala-de-estar", "Sala de Estar", "dry", 4),
  room("quartos", "Quartos", "dry", 3, 2),
  room("banheiro", "Banheiro", "wet", 8),
  room("lavabo", "Lavabo", "wet", 7),
  room("area-de-servico", "Área de Serviço", "wet", 6),
  room("terraco", "Terraço", "dry", 6),
];

const highEndRooms = (): RoomConfig[] => [
  room("hall-privativo", "Hall Privativo", "dry", 3),
  room("cozinha", "Cozinha", "wet", 6),
  room("sala-de-estar", "Sala de Estar", "dry", 4),
  room("quartos", "Quartos", "dry", 3, 3),
  room("banheiros", "Banheiros", "wet", 8, 2),
  room("lavabo", "Lavabo", "wet", 7),
  room("area-de-servico", "Área de Serviço", "wet", 6),
  room("terraco", "Terraço", "dry", 6),
];

/** Metragens de composição idêntica dentro de um preset — o vendedor
    diferencia depois. `variants` conta a planta base junto: base + N extras.
    Sem nenhum ambiente marcado como impactado as variações extras renderiam
    0 imagens e os cards apareceriam vazios.

    Helper de construção, avaliado UMA vez na carga do módulo: o que fica
    exportado é dado puro. Chama `rooms()` por metragem, então cada uma sai com
    seu próprio array — sem aliasing dentro do preset. */
const sameUnitTypes = (
  count: number,
  rooms: () => RoomConfig[],
  variants: number,
  impacted: string[],
): UnitTypeState[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    rooms: rooms(),
    variants,
    impactedRooms: Object.fromEntries(impacted.map((id) => [id, true])),
  }));

export const PROJECT_SIZE_PRESETS: readonly ProjectSizePreset[] = [
  {
    id: "studio",
    name: "Studio",
    hint: "2 metragens · 5 ambientes",
    dryOptions: 3,
    wetOptions: 3,
    /* Terraço junto da Cozinha/Sala nos impactados: integrar ou fechar a
       varanda é a variação de planta clássica de studio. */
    unitTypes: sameUnitTypes(2, studioRooms, 2, ["cozinha-sala", "terraco"]),
  },
  {
    id: "standard",
    name: "Padrão",
    hint: "3 metragens · 7 ambientes",
    dryOptions: 3,
    wetOptions: 3,
    unitTypes: sameUnitTypes(3, standardRooms, 2, ["sala-de-estar", "cozinha"]),
  },
  {
    id: "high-end",
    name: "Alto padrão",
    hint: "3 metragens · 8 ambientes",
    dryOptions: 3,
    wetOptions: 3,
    unitTypes: sameUnitTypes(3, highEndRooms, 3, ["sala-de-estar", "cozinha"]),
  },
];

export const ESTIMATE_DEFAULTS = {
  dryOptions: 3,
  wetOptions: 3,
  /** Valor em R$ da imagem base — o render do ambiente modelado em 3D.
      Não é editável na UI do cliente, só via painel escondido (Ctrl+Alt+K). */
  baseImagePrice: 84,
  /** Valor em R$ da imagem de opção — recorte de material/acabamento sobre a
      imagem base, por isso mais barata. Mesmo painel escondido. */
  optionImagePrice: 28,
  /** DADO, não factory. Quem monta o state da calculadora clona com
      `materializeUnitTypes()` — ver a nota de aliasing em `estimateTypes.ts`. */
  initialUnitTypes: [
    {
      id: 1,
      rooms: materializeRooms(DEFAULT_ROOMS),
      variants: 1,
      impactedRooms: {},
    },
  ] as UnitTypeState[],
};

/** Teto de meses do simulador de plano. Era `MAX_MONTHS` dentro do
    `PricingSlide`; vem pra cá porque é um default de estimativa, e a etapa 1 o
    move pra `EstimateConfig.maxMonths`. */
export const MAX_MONTHS = 36;

/** Meses já preenchidos quando o simulador abre. ZERO no deck padrão: o `/fast`
    é uma conversa aberta e um número no stepper antes de a conversa começar é
    uma proposta que ninguém fez. Cada proposta do /admin sobrescreve isto na aba
    "Planos e preços" — é lá que o prazo já foi negociado. */
export const DEFAULT_CONTRACTED_MONTHS = 0;

export type Plan = {
  n: string;
  items: string[];
  /** Valor mensal cru. É a ÚNICA fonte do preço: o rótulo exibido é derivado
      daqui via `formatCurrency` + `discountedMonthlyPrice`. O antigo
      `priceLabel` duplicava este número numa string e ninguém renderizava —
      um admin editando um campo e não o outro era bug garantido em pitch. */
  monthlyPrice: number;
  featured?: boolean;
};

/* `BillingCycle` mora em `src/lib/estimateTypes.ts` — `src/lib/pricing.ts` opera
   sobre ele. Re-exportado aqui pra manter o import único pros consumidores. */
export type { BillingCycle } from "@/lib/estimateTypes";

/** Descontos progressivos por ciclo. Sem trimestral — só semestral (−5%)
    e anual (−10%). Manter em ordem crescente de `minMonths`. */
export const billingCycles: BillingCycle[] = [
  { id: "mensal", label: "Mensal", discount: 0, minMonths: 1 },
  { id: "semestral", label: "Semestral", discount: 0.05, minMonths: 6 },
  { id: "anual", label: "Anual", discount: 0.1, minMonths: 12 },
];

/** Modelo de precificação: um plano só, com todos os módulos inclusos.
    Array de um item porque o CTA e o simulador de meses operam sobre lista —
    mantém a porta aberta pra voltar a ter tiers sem refactor. */
export const plans: Plan[] = [
  {
    n: "Plano único",
    items: ["Planner", "Personaliza", "Inspetor", "Infraestrutura", "Suporte"],
    monthlyPrice: 1599,
    featured: true,
  },
];
