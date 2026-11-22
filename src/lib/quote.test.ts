import { describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
import { proposalQuote } from "@/lib/quote";

/* Dinheiro tem teste, obrigatoriamente (ADR 12) — e este número é dinheiro que
   aparece numa tabela onde uma proposta é comparada com outra.

   Os números canônicos moram em `docs/estimate.md`.

   Os defaults reais, via `buildDefaultDeck()`, e não um objeto montado à mão:
   um teste com preços inventados passaria com o config errado. */

const DEFAULTS = buildDefaultDeck().estimate;

describe("o orçamento de uma proposta", () => {
  it("usa a semente da calculadora para as imagens", () => {
    const quote = proposalQuote(DEFAULTS);

    // A linha "Defaults" de docs/estimate.md: 45 imagens, R$ 1.428.
    expect(quote.imageCount).toBe(45);
    expect(quote.imageCost).toBe(1428);
  });

  it("cota com as tarifas da proposta, não com as do deck padrão", () => {
    const quote = proposalQuote({ ...DEFAULTS, imagePrices: { base: 100, option: 50 } });

    // As mesmas 45 imagens — 3 base e 42 de opção — nas tarifas novas.
    expect(quote.imageCount).toBe(45);
    expect(quote.imageCost).toBe(3 * 100 + 42 * 50);
  });
});
