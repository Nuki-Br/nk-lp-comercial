/** Quanto vale uma proposta, para quem a emitiu.
 *
 * A lista do /admin precisa de uma cifra por linha — o setup de imagens — e ela
 * não existia como valor: sai da semente da calculadora. Este módulo compõe as
 * funções que já existem.
 *
 * NÃO há aritmética nova aqui. `computeEstimate` + `estimateCost` dão as
 * imagens, exatamente como a `CalculatorSlide` faz no deck. Uma segunda conta
 * aqui seria uma segunda cotação, e a que vale seria sempre a outra.
 *
 * O QUE ESTE NÚMERO NÃO É: o que o cliente vai fechar. As imagens são as da
 * ABERTURA da calculadora — o cliente ainda mexe nela durante a apresentação.
 */

import { computeEstimate, estimateCost } from "@/lib/estimate";
import type { UnitTypeState } from "@/lib/estimateTypes";

/** A parte de `EstimateConfig` que o orçamento lê.
 *
 * Estrutural, e não `import type { EstimateConfig }`: `src/lib/` é a camada
 * pura que os dois lados importam, e ela não sobe para `src/deck/`. Um
 * `EstimateConfig` satisfaz este tipo. */
export type QuoteInput = {
  imagePrices: { base: number; option: number };
  defaults: { dryOptions: number; wetOptions: number; unitTypes: UnitTypeState[] };
};

export type ProposalQuote = {
  /** Imagens da abertura da calculadora. */
  imageCount: number;
  imageCost: number;
};

export function proposalQuote(estimate: QuoteInput): ProposalQuote {
  const { total } = computeEstimate(estimate.defaults.unitTypes, {
    dryOptions: estimate.defaults.dryOptions,
    wetOptions: estimate.defaults.wetOptions,
  });
  const imageCost = estimateCost(total, {
    baseImagePrice: estimate.imagePrices.base,
    optionImagePrice: estimate.imagePrices.option,
  });

  return { imageCount: total.total, imageCost };
}
