import { describe, expect, it } from "vitest";
import { anchorsOf } from "@/deck/anchors";
import { buildDefaultDeck } from "@/deck/defaults";
import { stripRetired } from "@/deck/retired";
import type { DeckConfig } from "@/deck/types";

/* Um documento congelado antes das ADRs 26 e 27 ainda traz o slide de plano, a
   calculadora e o frame de total. O que este arquivo fixa é o que acontece com
   ele na leitura: os nós somem ANTES de o progress-nav ganhar pontos sem
   âncora, e o resto do documento passa intacto. */

const RETIRED_IDS = ["pricing", "calculator", "total"];

/** O deck padrão com o que um snapshot antigo trazia a mais. Montado por cima
    do default, e não escrito à mão, para que o resto do documento seja real. */
const legacySnapshot = (): DeckConfig => {
  const config = structuredClone(buildDefaultDeck()) as unknown as {
    slides: Record<string, unknown>[];
    estimate?: unknown;
    chrome: Record<string, unknown>;
  };

  config.slides.push(
    { kind: "pricing", id: "pricing", label: "Plano & contato", enabled: true, tone: "dark" },
    { kind: "calculator", id: "calculator", label: "Estime o setup", enabled: true },
    { kind: "total", id: "total", label: "Total estimado", enabled: true },
  );
  config.estimate = {
    plans: [{ n: "Plano único", items: [], monthlyPrice: 1 }],
    maxMonths: 36,
    imagePrices: { base: 84, option: 28 },
  };
  config.chrome.allowPriceOverride = true;

  return config as unknown as DeckConfig;
};

describe("stripRetired", () => {
  it("é a identidade num config escrito por este build", () => {
    expect(stripRetired(buildDefaultDeck())).toEqual(buildDefaultDeck());
  });

  it("devolve um snapshot antigo igual ao deck de hoje", () => {
    expect(stripRetired(legacySnapshot())).toEqual(buildDefaultDeck());
  });

  it("tira os pontos de nav junto com os slides", () => {
    const before = anchorsOf(legacySnapshot().slides).map((anchor) => anchor.id);
    const after = anchorsOf(stripRetired(legacySnapshot()).slides).map((anchor) => anchor.id);

    for (const id of RETIRED_IDS) {
      expect(before).toContain(id);
      expect(after).not.toContain(id);
    }
  });

  it("é idempotente", () => {
    const once = stripRetired(legacySnapshot());
    expect(stripRetired(once)).toEqual(once);
  });

  it("não altera o documento que recebeu", () => {
    const snapshot = legacySnapshot();
    stripRetired(snapshot);

    expect(snapshot.slides.map((node) => node.id)).toEqual(expect.arrayContaining(RETIRED_IDS));
    expect(snapshot).toHaveProperty("estimate");
    expect(snapshot.chrome).toHaveProperty("allowPriceOverride", true);
  });
});
