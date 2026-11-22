import { describe, expect, it } from "vitest";
import { anchorsOf } from "@/deck/anchors";
import { buildDefaultDeck } from "@/deck/defaults";
import { stripRetired, stripRetiredEstimate } from "@/deck/retired";
import type { DeckConfig } from "@/deck/types";

/* Um documento congelado antes da ADR 26 ainda traz o slide de plano. O que
   este arquivo fixa é o que acontece com ele na leitura: o nó some ANTES de o
   progress-nav ganhar um ponto sem âncora, e o resto do documento passa
   intacto. */

/** O deck padrão com o que um snapshot antigo trazia a mais. Montado por cima
    do default, e não escrito à mão, para que o resto do documento seja real. */
const legacySnapshot = (): DeckConfig => {
  const config = structuredClone(buildDefaultDeck()) as unknown as {
    slides: Record<string, unknown>[];
    estimate: Record<string, unknown>;
  };

  const calculator = config.slides.findIndex((node) => node.id === "calculator");
  config.slides.splice(calculator, 0, {
    kind: "pricing",
    id: "pricing",
    label: "Plano & contato",
    enabled: true,
    tone: "dark",
  });

  const total = config.slides.find((node) => node.id === "total");
  if (total) total.labels = { ...(total.labels as object), platform: "Plataforma" };

  config.estimate.plans = [{ n: "Plano único", items: [], monthlyPrice: 1 }];
  config.estimate.billingCycles = [{ id: "mensal", label: "Mensal", discount: 0, minMonths: 1 }];
  config.estimate.maxMonths = 36;
  config.estimate.defaultMonths = 12;

  return config as unknown as DeckConfig;
};

describe("stripRetired", () => {
  it("é a identidade num config escrito por este build", () => {
    expect(stripRetired(buildDefaultDeck())).toEqual(buildDefaultDeck());
  });

  it("devolve um snapshot antigo igual ao deck de hoje", () => {
    expect(stripRetired(legacySnapshot())).toEqual(buildDefaultDeck());
  });

  it("tira o ponto de nav junto com o slide", () => {
    const before = anchorsOf(legacySnapshot().slides).map((anchor) => anchor.id);
    const after = anchorsOf(stripRetired(legacySnapshot()).slides).map((anchor) => anchor.id);

    expect(before).toContain("pricing");
    expect(after).not.toContain("pricing");
  });

  it("é idempotente", () => {
    const once = stripRetired(legacySnapshot());
    expect(stripRetired(once)).toEqual(once);
  });

  it("não altera o documento que recebeu", () => {
    const snapshot = legacySnapshot();
    stripRetired(snapshot);

    expect(snapshot.slides.map((node) => node.id)).toContain("pricing");
    expect(snapshot.estimate).toHaveProperty("plans");
  });
});

describe("stripRetiredEstimate", () => {
  it("tira os campos de plano de um delta parcial e deixa o resto", () => {
    const patch = { maxMonths: 24, imagePrices: { base: 99, option: 33 } };

    expect(stripRetiredEstimate(patch)).toEqual({ imagePrices: { base: 99, option: 33 } });
  });
});
