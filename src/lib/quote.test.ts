import { describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
import { proposalQuote, QUOTE_REFERENCE_MONTHS } from "@/lib/quote";

/* Dinheiro tem teste, obrigatoriamente (ADR 12) — e este número é dinheiro que
   aparece numa tabela onde uma proposta é comparada com outra.

   O risco específico que ele cobre: o total é a única cifra do repositório que
   COMPÕE as duas metades da conta (imagens + plataforma). Um erro na composição
   — esquecer o desconto do ciclo, somar a mensalidade de tabela, ignorar o teto
   do simulador — não quebra nem a calculadora nem o slide de planos, então
   nenhum outro teste o veria. Os números canônicos moram em `docs/estimate.md`.

   Os defaults reais, via `buildDefaultDeck()`, e não um objeto montado à mão:
   um teste com preços inventados passaria com o config errado. */

const DEFAULTS = buildDefaultDeck().estimate;

describe("o orçamento de uma proposta nos defaults", () => {
  const quote = proposalQuote(DEFAULTS);

  it("cai no ciclo anual em 12 meses", () => {
    expect(quote.months).toBe(12);
    expect(quote.cycle?.id).toBe("anual");
  });

  it("desconta a mensalidade pelo ciclo", () => {
    // R$ 1.599 de tabela, −10% do anual.
    expect(quote.monthlyPrice).toBe(1599);
    expect(quote.monthlyAfterDiscount).toBe(1439);
  });

  it("usa a semente da calculadora para as imagens", () => {
    // A linha "Defaults" de docs/estimate.md: 45 imagens, R$ 1.428.
    expect(quote.imageCount).toBe(45);
    expect(quote.imageCost).toBe(1428);
  });

  it("soma plataforma e imagens no total", () => {
    expect(quote.platformCost).toBe(12 * 1439);
    expect(quote.grandTotal).toBe(1428 + 12 * 1439);
    // A invariante que a composição não pode furar.
    expect(quote.grandTotal).toBe(quote.imageCost + quote.platformCost);
  });

  it("cobra os meses com desconto, não a mensalidade de tabela", () => {
    expect(quote.platformCost).not.toBe(quote.months * quote.monthlyPrice);
  });
});

describe("os casos que degradam", () => {
  it("respeita o teto do simulador da proposta", () => {
    const quote = proposalQuote({ ...DEFAULTS, maxMonths: 6 });

    expect(quote.months).toBe(6);
    // 6 meses caem no semestral (−5%), não no anual.
    expect(quote.cycle?.id).toBe("semestral");
    expect(quote.monthlyAfterDiscount).toBe(1519);
    expect(quote.platformCost).toBe(6 * 1519);
  });

  it("sem ciclos, cobra a mensalidade cheia em vez de estourar", () => {
    const quote = proposalQuote({ ...DEFAULTS, billingCycles: [] });

    expect(quote.cycle).toBeNull();
    expect(quote.monthlyAfterDiscount).toBe(quote.monthlyPrice);
  });

  it("sem planos, o total é só o setup de imagens", () => {
    const quote = proposalQuote({ ...DEFAULTS, plans: [] });

    expect(quote.monthlyPrice).toBe(0);
    expect(quote.platformCost).toBe(0);
    expect(quote.grandTotal).toBe(quote.imageCost);
  });

  it("cobra o plano em destaque, não o primeiro da lista", () => {
    const quote = proposalQuote({
      ...DEFAULTS,
      plans: [{ monthlyPrice: 100 }, { monthlyPrice: 900, featured: true }],
    });

    expect(quote.monthlyPrice).toBe(900);
  });

  it("o prazo de referência é o piso do ciclo anual", () => {
    expect(QUOTE_REFERENCE_MONTHS).toBe(
      DEFAULTS.billingCycles.find((cycle) => cycle.id === "anual")?.minMonths,
    );
  });
});
