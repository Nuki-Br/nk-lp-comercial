/** Vocabulário compartilhado da calculadora: os tipos de ambiente/metragem, a
    constante de imagens base e os intervalos de clamp.

    Por que existe um arquivo só pra isso. Antes estes símbolos moravam em
    `src/content/deck.ts` e `src/lib/estimate.ts` importava DE LÁ — seta invertida:
    `src/lib/` é a camada pura, importável dos dois lados, e não pode depender de
    conteúdo. Pior, isso obrigava `CalculatorSlide` a importar `ESTIMATE_RANGES`
    de `@/content/`, que a etapa 1 proíbe em slides.

    Agora a seta aponta pra cá: `content/deck.ts` e `lib/estimate.ts` importam
    deste módulo, e nenhum dos dois importa o outro.

    Sem React, sem `process.env`, sem acesso a banco. */

/** Classe do ambiente decide qual multiplicador de opções usar. Áreas
    molhadas (banho, cozinha, Área de Serviço) oferecem mais superfícies
    personalizáveis do que secas (quartos, sala). */
export type RoomAreaType = "seca" | "molhada";

/** Categoria de "peso" visual do tile — 3 tiers só, pra ler à distância
    sem virar um degradê contínuo difícil de decodificar. */
export type RoomWeight = "light" | "medium" | "heavy";

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

export type UnitTypeState = {
  /** id estável pra React keys; muda por metragem, nunca reindex por posição */
  id: number;
  rooms: RoomConfig[];
  variants: number;
  impactedRooms: ImpactedRooms;
};

/** Imagens base por unidade de ambiente. Cada unidade é uma cena 3D própria:
    2 quartos = 2 modelagens = 2 imagens base. */
export const BASE_IMAGES_PER_ROOM_UNIT = 1;

/** Ciclo de cobrança — desconto aplicado sobre o preço mensal de cada plano.
    `minMonths` é o piso de meses que ativa o ciclo: o simulador deriva o ciclo
    dos meses contratados, então o valor precisa viver aqui junto do desconto.

    Mora nesta camada (e não em `content/`) porque `src/lib/pricing.ts` opera
    sobre ele — `src/lib/` é puro e não pode depender de conteúdo. */
export type BillingCycle = {
  id: string;
  label: string;
  discount: number;
  minMonths: number;
};

/** Clamps de cada campo editável. Fica em código, NÃO em `DeckConfig`: é o que
    impede um erro de digitação no /admin de virar um orçamento absurdo, então
    não é algo que um admin edita. Ver docs/estimate.md. */
export const ESTIMATE_RANGES = {
  units: { min: 0, max: 5 },
  components: { min: 1, max: 15 },
  /** Máximo 5 = planta base + 4 variações extras. Os presets param em 3; o
      resto é folga pra configuração manual numa reunião. O seletor de variações
      desenha uma pill por valor deste intervalo, então mexer aqui basta. */
  variants: { min: 1, max: 5 },
  unitTypes: { min: 1, max: 6 },
  dryOptions: { min: 1, max: 6 },
  wetOptions: { min: 1, max: 8 },
  baseImagePrice: { min: 1, max: 9999 },
  optionImagePrice: { min: 1, max: 999 },
};

/* ------------------------------------------------------------------
   Materialização

   `UnitTypeState` e `RoomConfig` viajam como DADOS puros no `DeckConfig` —
   têm que sobreviver a `JSON.parse(JSON.stringify(x))` pra chegar no JSONB,
   então não podem ser factories.

   O perigo que as factories escondiam não era mutação in-place (os updaters
   do CalculatorSlide são imutáveis: `prev.map` + spread). Era ALIASING: com
   dado puro, as N metragens de um preset compartilhariam a MESMA referência
   de `rooms`, e o primeiro `prev.map` que devolvesse o array original faria
   duas metragens andarem juntas. Clonar na hora do uso move essa
   responsabilidade pro consumidor, onde ela é visível.
   ------------------------------------------------------------------ */

/** Cópia profunda de uma lista de ambientes. */
export const materializeRooms = (rooms: readonly RoomConfig[]): RoomConfig[] =>
  rooms.map((r) => ({ ...r }));

/** Cópia profunda de uma lista de metragens — inclusive `rooms` e
    `impactedRooms`, que são os dois níveis aninhados que o aliasing pegaria. */
export const materializeUnitTypes = (unitTypes: readonly UnitTypeState[]): UnitTypeState[] =>
  unitTypes.map((u) => ({
    ...u,
    rooms: materializeRooms(u.rooms),
    impactedRooms: { ...u.impactedRooms },
  }));
