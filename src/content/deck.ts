/* Conteúdo da apresentação comercial Nuki.
   Rascunhos baseados em (a) PPT "Migração do Modelo de Precificação" (slides 1-13)
   e (b) contexto-de-produto-v2.md (§§ 1-12). Copy pode ser refinado pelo user;
   estrutura das seções serve como base. */

export const deckNav = [
  { id: "cover", label: "Capa" },
  { id: "problem", label: "O problema" },
  { id: "what-is-nuki", label: "O que é a Nuki" },
  { id: "planner", label: "Planner" },
  { id: "personaliza", label: "Personaliza" },
  { id: "inspetor", label: "Inspetor" },
  { id: "differentiators", label: "Diferenciais" },
  { id: "audience", label: "Pra quem serve" },
  { id: "cases", label: "Cases" },
  { id: "calculator", label: "Estime o setup" },
  { id: "pricing", label: "Plano & contato" },
  { id: "total", label: "Total estimado" },
] as const;

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
    foco:
      "Organização e controle do processo, redução de retrabalho, visibilidade em tempo real do andamento das unidades.",
    pain:
      "Processos manuais sem padronização, falta de rastreabilidade das escolhas, pressão da obra e da diretoria.",
  },
  {
    role: "Persona 02",
    name: "Diretor / CEO",
    foco:
      "Eficiência operacional e margem, diferenciação de mercado, escalabilidade sem aumento de headcount, governança e redução de risco.",
    pain:
      "Retrabalho invisível que come margem, disputas jurídicas, tecnologia como vantagem competitiva ainda não capturada.",
  },
  {
    role: "Persona 03",
    name: "Supervisor de Obra",
    foco:
      "Clareza sobre o que precisa ser corrigido, documentação que sustenta decisões técnicas, comunicação limpa com o pós-venda.",
    pain:
      "Recebe comunicados vagos sobre o que corrigir, sem registro formal do que foi aprovado ou rejeitado.",
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

   Cálculo por ambiente:
     imgs = ambiente.quantidade × ambiente.componentes × opcoes[classe]
   Onde opcoes[classe] vem dos inputs globais de "Opções por componente"
   separados em secas vs molhadas.

   Referência histórica dos números do orçamento Tecer/Manawa (R01, 27/06/2026)
   quando as unidades assumiam 3 opções por componente:
     Sala 10 · Dorm 10 · Escrit 10 · Cozinha 19 · Lavabo 20 · Banho 23
     Lavanderia 17 · Varanda 18
   Não é mais fonte primária — serve só de sanity check pros defaults.
   ============================================================ */

/** Classe do ambiente decide qual multiplicador de opções usar. Áreas
    molhadas (banho, cozinha, lavanderia) oferecem mais superfícies
    personalizáveis do que secas (quartos, sala). */
export type RoomAreaType = "seca" | "molhada";

/** Categoria de "peso" visual do tile — 3 tiers só, pra ler à distância
    sem virar um degradê contínuo difícil de decodificar. */
export type RoomWeight = "leve" | "medio" | "pesado";

/** Configuração de um ambiente dentro de uma metragem. */
export type RoomConfig = {
  /** único por metragem: "quartos"/"banheiros" pros defaults, "custom-N" pros criados pelo user */
  id: string;
  name: string;
  areaType: RoomAreaType;
  weight: RoomWeight;
  units: number;
  components: number;
  /** true = não pode ser removido nem tem nome/classe editáveis (defaults Quartos/Banheiros) */
  locked?: boolean;
};

/** Ambientes impactados pelas variações extras da metragem — keyed pelo
    ambient.id. Cada id marcado contribui com 1 unidade × img por variação
    extra. Modelo simples que cobre "cozinha aberta", "1 quarto que vira
    escritório", "banho reformulado" sem bundles fixos. */
export type ImpactedRooms = Record<string, boolean>;

export const noImpactedRooms = (): ImpactedRooms => ({});

/** Ambientes com que toda metragem começa. Só Quartos + Banheiros — o
    resto o user adiciona via "+ Adicionar ambiente" digitando nome e
    escolhendo seca/molhada. */
export const buildDefaultRooms = (): RoomConfig[] => [
  {
    id: "quartos",
    name: "Quartos",
    areaType: "seca",
    weight: "leve",
    units: 2,
    components: 3,
    locked: true,
  },
  {
    id: "banheiros",
    name: "Banheiros",
    areaType: "molhada",
    weight: "pesado",
    units: 1,
    components: 8,
    locked: true,
  },
];

/** Defaults aplicados a ambientes custom criados via "+ Adicionar". */
export const CUSTOM_ROOM_DEFAULTS = {
  weight: "medio" as RoomWeight,
  units: 1,
  components: 4,
};

/** Presets rápidos exibidos como chips no "+ Adicionar ambiente". Clicar num
    chip adiciona o ambient com nome + classe pré-preenchidos + defaults de
    peso/quantidade/componentes (via CUSTOM_AMBIENTE_DEFAULTS) — user pode
    editar depois nos controles do tile. Bate com a lista histórica de
    referência: Sala/Cozinha/Lavabo/Lavanderia/Varanda. Cobre 3 molhadas +
    2 secas — as combinações mais comuns em apto residencial. */
export const ROOM_PRESETS: readonly {
  readonly name: string;
  readonly areaType: RoomAreaType;
}[] = [
  { name: "Sala", areaType: "seca" },
  { name: "Lavabo", areaType: "molhada" },
  { name: "Cozinha", areaType: "molhada" },
  { name: "Lavanderia", areaType: "molhada" },
  { name: "Varanda", areaType: "seca" },
];

export type UnitTypeState = {
  /** id estável pra React keys; muda por metragem, nunca reindex por posição */
  id: number;
  rooms: RoomConfig[];
  variants: number;
  impactedRooms: ImpactedRooms;
};

export const ESTIMATE_DEFAULTS = {
  dryOptions: 3,
  wetOptions: 3,
  /** Valor por imagem em R$. Não é editável na UI do cliente — só via painel
      escondido (Ctrl+Alt+K). Ver Calculadora.tsx. */
  pricePerImage: 28,
  initialUnitTypes: (): UnitTypeState[] => [
    {
      id: 1,
      rooms: buildDefaultRooms(),
      variants: 1,
      impactedRooms: noImpactedRooms(),
    },
  ],
};

export const ESTIMATE_RANGES = {
  units: { min: 0, max: 5 },
  components: { min: 1, max: 15 },
  variants: { min: 1, max: 3 },
  unitTypes: { min: 1, max: 6 },
  dryOptions: { min: 1, max: 6 },
  wetOptions: { min: 1, max: 8 },
  pricePerImage: { min: 1, max: 999 },
};

export type Plan = {
  n: string;
  items: string[];
  /** Rótulo de exibição formatado (ex: "R$ 889/mês") */
  priceLabel: string;
  /** Valor mensal cru pra cálculos (soma × meses no simulador do CTA) */
  monthlyPrice: number;
  featured?: boolean;
};

/** Ciclo de cobrança — desconto aplicado sobre o preço mensal de cada plano. */
export type BillingCycle = { id: string; label: string; discount: number };

/** Descontos progressivos por ciclo. Sem trimestral — só semestral (−5%)
    e anual (−10%). */
export const billingCycles: BillingCycle[] = [
  { id: "mensal", label: "Mensal", discount: 0 },
  { id: "semestral", label: "Semestral", discount: 0.05 },
  { id: "anual", label: "Anual", discount: 0.1 },
];

/** Modelo de precificação: um plano só, com todos os módulos inclusos.
    Array de um item porque o CTA e o simulador de meses operam sobre lista —
    mantém a porta aberta pra voltar a ter tiers sem refactor. */
export const plans: Plan[] = [
  {
    n: "Plano único",
    items: ["Planner", "Personaliza", "Inspetor", "Infraestrutura", "Suporte"],
    priceLabel: "R$ 1.150/mês",
    monthlyPrice: 1150,
    featured: true,
  },
];
