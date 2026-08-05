import { describe, expect, it } from "vitest";
import { ESTIMATE_DEFAULTS, PROJECT_SIZE_PRESETS } from "@/content/deck";
import { computeEstimate, estimateCost } from "@/lib/estimate";
import { materializeUnitTypes, type UnitTypeState } from "@/lib/estimateTypes";
import { formatCurrency } from "@/lib/format";

/* Por que este arquivo existe: `AGENTS.md` afirmou totais de preset de
   208 / 678 / 1.544 enquanto o código produzia 284 / 507 / 738, e o mesmo número
   errado foi repetido em outros dois arquivos. Um teste de dez linhas teria
   pegado isso no dia em que a composição dos presets mudou. Ver ADR 12.

   A tabela canônica mora em `docs/estimate.md` e em lugar nenhum mais. Se um
   preset mudar, este teste falha, você re-deriva e atualiza AQUELE arquivo. */

const PRICES = {
  baseImagePrice: ESTIMATE_DEFAULTS.baseImagePrice,
  optionImagePrice: ESTIMATE_DEFAULTS.optionImagePrice,
};

/** As quatro linhas de docs/estimate.md, como NÚMEROS.

    Deliberadamente não são strings formatadas: `Intl` pt-BR separa "R$" dos
    dígitos com um espaço NÃO-QUEBRÁVEL (U+00A0), então `"R$ 1.428"` digitado
    num editor nunca bate com a saída do `formatCurrency`. Comparar números
    remove a classe de falso-negativo inteira; o formato tem seu próprio teste
    no fim do arquivo. */
const CANONICAL = [
  { name: "Defaults", total: 45, base: 3, option: 42, cost: 1428 },
  { name: "Studio", total: 284, base: 14, option: 270, cost: 8736 },
  { name: "Padrão", total: 507, base: 30, option: 477, cost: 15876 },
  { name: "Alto padrão", total: 738, base: 45, option: 693, cost: 23184 },
] as const;

const scenario = (name: string): { unitTypes: UnitTypeState[]; dry: number; wet: number } => {
  if (name === "Defaults") {
    return {
      unitTypes: materializeUnitTypes(ESTIMATE_DEFAULTS.initialUnitTypes),
      dry: ESTIMATE_DEFAULTS.dryOptions,
      wet: ESTIMATE_DEFAULTS.wetOptions,
    };
  }
  const preset = PROJECT_SIZE_PRESETS.find((p) => p.name === name);
  if (!preset) throw new Error(`preset "${name}" não existe mais em PROJECT_SIZE_PRESETS`);
  return {
    unitTypes: materializeUnitTypes(preset.unitTypes),
    dry: preset.dryOptions,
    wet: preset.wetOptions,
  };
};

describe("os quatro cenários canônicos", () => {
  it.each(CANONICAL)("$name → $total imagens, R$ $cost", ({ name, total, base, option, cost }) => {
    const { unitTypes, dry, wet } = scenario(name);
    const result = computeEstimate(unitTypes, { dryOptions: dry, wetOptions: wet });

    expect(result.total.base).toBe(base);
    expect(result.total.option).toBe(option);
    expect(result.total.total).toBe(total);
    // `total` é sempre base + option — a invariante que a soma não pode furar.
    expect(result.total.total).toBe(result.total.base + result.total.option);

    expect(estimateCost(result.total, PRICES)).toBe(cost);
  });

  it("as tarifas ainda são R$ 84 base / R$ 28 opção", () => {
    // Os quatro custos acima só valem sob estas tarifas. Se elas mudarem, a
    // tabela inteira precisa ser re-derivada — falhar aqui diz isso na hora.
    expect(PRICES).toEqual({ baseImagePrice: 84, optionImagePrice: 28 });
  });
});

describe("materialização (a conversão factory → dado)", () => {
  /* Os presets deixaram de ser factories pra poder virar JSONB. O perigo que as
     factories escondiam não era mutação in-place — era ALIASING: sem clonar, duas
     aplicações do mesmo preset compartilhariam as mesmas referências e andariam
     juntas, e os números acima sairiam errados na segunda vez. */

  it("duas aplicações do mesmo preset não compartilham referências", () => {
    const a = materializeUnitTypes(PROJECT_SIZE_PRESETS[0].unitTypes);
    const b = materializeUnitTypes(PROJECT_SIZE_PRESETS[0].unitTypes);

    a[0].rooms[0].components = 999;
    a[0].impactedRooms.__probe = true;

    expect(b[0].rooms[0].components).not.toBe(999);
    expect(b[0].impactedRooms.__probe).toBeUndefined();
  });

  it("mutar a cópia não toca o dado do módulo", () => {
    const original = PROJECT_SIZE_PRESETS[0].unitTypes[0].rooms[0].components;
    const copy = materializeUnitTypes(PROJECT_SIZE_PRESETS[0].unitTypes);
    copy[0].rooms[0].components = 999;

    expect(PROJECT_SIZE_PRESETS[0].unitTypes[0].rooms[0].components).toBe(original);
  });

  it("metragens irmãs de um mesmo preset têm arrays de ambientes distintos", () => {
    const multi = PROJECT_SIZE_PRESETS.find((p) => p.unitTypes.length > 1);
    if (!multi) throw new Error("nenhum preset com mais de uma metragem");

    const copy = materializeUnitTypes(multi.unitTypes);
    copy[0].rooms[0].components = 111;

    expect(copy[1].rooms[0].components).not.toBe(111);
  });

  it("aplicar o mesmo preset duas vezes dá o mesmo total", () => {
    // O teste que amarra o aliasing de volta ao dinheiro.
    const preset = PROJECT_SIZE_PRESETS[2];
    const opts = { dryOptions: preset.dryOptions, wetOptions: preset.wetOptions };

    const first = computeEstimate(materializeUnitTypes(preset.unitTypes), opts).total.total;
    const second = computeEstimate(materializeUnitTypes(preset.unitTypes), opts).total.total;

    expect(second).toBe(first);
    expect(second).toBe(738);
  });
});

describe("serialização", () => {
  /* `DeckConfig` trafega por JSONB. Nada da configuração de estimativa pode ser
     função, `Date` ou `Map` — ou o round-trip perde silenciosamente. */

  it.each([
    ["PROJECT_SIZE_PRESETS", PROJECT_SIZE_PRESETS],
    ["ESTIMATE_DEFAULTS", ESTIMATE_DEFAULTS],
  ])("%s sobrevive ao round-trip JSON", (_name, value) => {
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });

  it("nenhum preset carrega função", () => {
    for (const preset of PROJECT_SIZE_PRESETS) {
      for (const v of Object.values(preset)) {
        expect(typeof v).not.toBe("function");
      }
    }
  });
});

describe("formatCurrency", () => {
  it("usa espaço NÃO-QUEBRÁVEL entre R$ e os dígitos", () => {
    /* Fixa a pegadinha que faz uma comparação de string mentir. `formatCurrency`
       é pt-BR via `Intl`, então o separador é U+00A0 — não o espaço que você
       digita. Qualquer asserção contra as tabelas dos docs precisa normalizar. */
    const formatted = formatCurrency(1428);

    expect(formatted).toBe("R$ 1.428");
    expect(formatted).not.toBe("R$ 1.428");
    expect(formatted.replace(/ /g, " ")).toBe("R$ 1.428");
  });

  it("não mostra centavos", () => {
    expect(formatCurrency(23184).replace(/ /g, " ")).toBe("R$ 23.184");
  });
});
