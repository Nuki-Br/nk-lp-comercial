/** Quanto vale uma proposta, para quem a emitiu.
 *
 * A lista do /admin precisa de três números por linha — mensalidade, setup de
 * imagens e total — e nenhum deles existia como valor: a mensalidade é do plano
 * em destaque, o setup sai da semente da calculadora, e o total só nasce quando
 * alguém arbitra um prazo. Este módulo arbitra esse prazo em UM lugar e compõe
 * as funções que já existem.
 *
 * NÃO há aritmética nova aqui. `computeEstimate` + `estimateCost` dão as
 * imagens, `cycleForMonths` + `discountedMonthlyPrice` dão a mensalidade, e o
 * custo de plataforma é `meses × mensalidade com desconto` — exatamente o que o
 * `EstimateProvider` soma no deck, com um plano em vez de N. Uma segunda conta
 * aqui seria uma segunda cotação, e a que vale seria sempre a outra.
 *
 * O QUE ESTE NÚMERO NÃO É: o que o cliente vai fechar. As imagens são as da
 * ABERTURA da calculadora — o cliente ainda mexe nela durante a apresentação —
 * e os meses são uma referência, não um compromisso. Daí `months` sair no
 * resultado: quem exibe tem de conseguir dizer sobre quantos meses está falando.
 */

import { computeEstimate, estimateCost } from "@/lib/estimate";
import type { BillingCycle, UnitTypeState } from "@/lib/estimateTypes";
import { cycleForMonths, discountedMonthlyPrice } from "@/lib/pricing";

/** O prazo de referência do total.
 *
 * 12 meses porque é o piso do ciclo anual nos defaults, ou seja, o cenário que
 * a proposta empurra. Trocar este número muda o total de TODAS as linhas da
 * lista e de mais nada — nenhuma proposta guarda um prazo. */
export const QUOTE_REFERENCE_MONTHS = 12;

/** A parte de `EstimateConfig` que o orçamento lê.
 *
 * Estrutural, e não `import type { EstimateConfig }`: `src/lib/` é a camada
 * pura que os dois lados importam, e ela não sobe para `src/deck/`. Um
 * `EstimateConfig` satisfaz este tipo. */
export type QuoteInput = {
  plans: readonly { monthlyPrice: number; featured?: boolean }[];
  billingCycles: readonly BillingCycle[];
  maxMonths: number;
  imagePrices: { base: number; option: number };
  defaults: { dryOptions: number; wetOptions: number; unitTypes: UnitTypeState[] };
};

export type ProposalQuote = {
  /** Os meses sobre os quais o total foi somado. Pode ser menor que
      `QUOTE_REFERENCE_MONTHS` — o teto do simulador da proposta manda. */
  months: number;
  /** O ciclo em que esses meses caem, ou `null` sem ciclos configurados. */
  cycle: BillingCycle | null;
  /** Mensalidade de tabela do plano de referência. */
  monthlyPrice: number;
  /** A mesma, com o desconto do ciclo — é a que o cliente pagaria. */
  monthlyAfterDiscount: number;
  /** Imagens da abertura da calculadora. */
  imageCount: number;
  imageCost: number;
  platformCost: number;
  grandTotal: number;
};

/** O plano que dá o preço: o em destaque, senão o primeiro.
 *
 * Mesma regra do painel da aba de preços, e pelo mesmo motivo — é o card que o
 * cliente lê primeiro. */
function referencePlan(plans: QuoteInput["plans"]) {
  return plans.find((plan) => plan.featured) ?? plans[0];
}

export function proposalQuote(
  estimate: QuoteInput,
  referenceMonths: number = QUOTE_REFERENCE_MONTHS,
): ProposalQuote {
  const monthlyPrice = referencePlan(estimate.plans)?.monthlyPrice ?? 0;

  /* Limitado pelo teto do simulador: um total de 12 meses numa proposta cujo
     simulador para em 6 seria um negócio que o cliente não consegue nem
     arrastar. */
  const months = Math.max(0, Math.min(referenceMonths, estimate.maxMonths));

  /* `cycleForMonths` semeia o reduce em `cycles[0]`; com a lista vazia devolve
     `undefined`, e o validador de config não garante que ela tenha alguém. Sem
     ciclo, sem desconto — que é a degradação certa. */
  const cycle =
    estimate.billingCycles.length > 0 ? cycleForMonths([...estimate.billingCycles], months) : null;
  const monthlyAfterDiscount = discountedMonthlyPrice(monthlyPrice, cycle?.discount ?? 0);

  const { total } = computeEstimate(estimate.defaults.unitTypes, {
    dryOptions: estimate.defaults.dryOptions,
    wetOptions: estimate.defaults.wetOptions,
  });
  const imageCost = estimateCost(total, {
    baseImagePrice: estimate.imagePrices.base,
    optionImagePrice: estimate.imagePrices.option,
  });
  const platformCost = months * monthlyAfterDiscount;

  return {
    months,
    cycle,
    monthlyPrice,
    monthlyAfterDiscount,
    imageCount: total.total,
    imageCost,
    platformCost,
    grandTotal: imageCost + platformCost,
  };
}
