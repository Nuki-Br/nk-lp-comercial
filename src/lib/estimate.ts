/** Matemática da calculadora "Estime o setup". Módulo puro, sem React —
    vive aqui e não dentro de CalculatorSlide.tsx porque passou a ter duas
    tarifas (imagem base vs imagem de opção) e o slide já é grande.

    Vocabulário, que tem duas palavras "base" perigosamente parecidas:
      - imagem BASE  → render do ambiente modelado em 3D, 1 por unidade
      - `mainVariant` → a Variação 01, a composição completa da metragem
    As variações 02+ re-renderizam só o subset de ambientes impactados. */

import {
  BASE_IMAGES_PER_ROOM_UNIT,
  type RoomAreaType,
  type RoomConfig,
  type RoomWeight,
  type UnitTypeState,
} from "@/content/deck";

/** Contagem de imagens quebrada por tarifa. `total` é sempre base + option. */
export type ImageMix = {
  base: number;
  option: number;
  total: number;
};

/** Uma unidade de ambiente renderizada — vira um tile no card de variação. */
export type RoomUnit = {
  key: string;
  label: string;
  weight: RoomWeight;
  baseImages: number;
  optionImages: number;
  /** soma das duas — é o número que o tile mostra */
  images: number;
};

export type UnitTypeBreakdown = {
  /** Composição completa da metragem — os tiles da Variação 01 */
  rooms: RoomUnit[];
  /** Subset re-renderizado a cada variação extra — os tiles da Variação 02+ */
  impactedRooms: RoomUnit[];
  /** Mix da composição completa (Variação 01) */
  mainVariant: ImageMix;
  /** Mix re-renderizado por variação extra (soma dos impactados) */
  perExtraVariant: ImageMix;
  /** Mix de todas as variações extras somadas */
  extraVariants: ImageMix;
  /** Mix total da metragem (mainVariant + extraVariants) */
  total: ImageMix;
};

const EMPTY_MIX: ImageMix = { base: 0, option: 0, total: 0 };

const mix = (base: number, option: number): ImageMix => ({
  base,
  option,
  total: base + option,
});

const sumMix = (a: ImageMix, b: ImageMix): ImageMix => mix(a.base + b.base, a.option + b.option);

const scaleMix = (m: ImageMix, factor: number): ImageMix => mix(m.base * factor, m.option * factor);

const mixOfRoomUnits = (units: RoomUnit[]): ImageMix =>
  units.reduce((acc, u) => sumMix(acc, mix(u.baseImages, u.optionImages)), EMPTY_MIX);

function optionsForArea(areaType: RoomAreaType, dryOptions: number, wetOptions: number): number {
  return areaType === "seca" ? dryOptions : wetOptions;
}

/** Rotula a n-ésima unidade de um ambiente. Se quantidade = 1, usa o nome
    inteiro (Sala, Cozinha, Home Office...). Se quantidade > 1, usa a
    primeira letra maiúscula + índice (Q1, Q2, B1, B2, S1...). */
function roomUnitLabel(a: RoomConfig, i: number): string {
  if (a.units === 1) return a.name;
  const first = a.name.trim().charAt(0).toUpperCase() || "A";
  return `${first}${i}`;
}

function roomUnit(a: RoomConfig, key: string, label: string, options: number): RoomUnit {
  const optionImages = a.components * options;
  return {
    key,
    label,
    weight: a.weight,
    baseImages: BASE_IMAGES_PER_ROOM_UNIT,
    optionImages,
    images: BASE_IMAGES_PER_ROOM_UNIT + optionImages,
  };
}

function buildRoomUnits(m: UnitTypeState, dryOptions: number, wetOptions: number): RoomUnit[] {
  const list: RoomUnit[] = [];
  m.rooms.forEach((a) => {
    if (a.units <= 0) return;
    const options = optionsForArea(a.areaType, dryOptions, wetOptions);
    for (let i = 1; i <= a.units; i++) {
      list.push(roomUnit(a, a.units === 1 ? a.id : `${a.id}-${i}`, roomUnitLabel(a, i), options));
    }
  });
  return list;
}

/** Constrói os tiles de "ambientes impactados" — 1 unidade por ambiente
    marcado, na ordem em que aparecem na lista da metragem. É o que aparece
    nos cards de Variação 02+, representando o subset que muda entre
    variações. Layout novo = modelagem nova, então a unidade impactada traz
    junto a imagem base dela. */
function buildImpactedRoomUnits(
  m: UnitTypeState,
  dryOptions: number,
  wetOptions: number,
): RoomUnit[] {
  return m.rooms
    .filter((a) => m.impactedRooms[a.id])
    .map((a) =>
      roomUnit(a, `impacto-${a.id}`, a.name, optionsForArea(a.areaType, dryOptions, wetOptions)),
    );
}

export function computeUnitType(
  m: UnitTypeState,
  dryOptions: number,
  wetOptions: number,
): UnitTypeBreakdown {
  const rooms = buildRoomUnits(m, dryOptions, wetOptions);
  const impactedRooms = buildImpactedRoomUnits(m, dryOptions, wetOptions);
  const mainVariant = mixOfRoomUnits(rooms);
  const perExtraVariant = mixOfRoomUnits(impactedRooms);
  const extraVariants = scaleMix(perExtraVariant, m.variants - 1);
  return {
    rooms,
    impactedRooms,
    mainVariant,
    perExtraVariant,
    extraVariants,
    total: sumMix(mainVariant, extraVariants),
  };
}

export function computeEstimate(
  unitTypes: UnitTypeState[],
  opts: { dryOptions: number; wetOptions: number },
): { breakdowns: UnitTypeBreakdown[]; total: ImageMix } {
  const breakdowns = unitTypes.map((m) => computeUnitType(m, opts.dryOptions, opts.wetOptions));
  return {
    breakdowns,
    total: breakdowns.reduce((acc, b) => sumMix(acc, b.total), EMPTY_MIX),
  };
}

export function estimateCost(
  m: ImageMix,
  prices: { baseImagePrice: number; optionImagePrice: number },
): number {
  return m.base * prices.baseImagePrice + m.option * prices.optionImagePrice;
}
