import type { BillingCycle } from "@/content/deck";

/** Preço mensal do plano já com o desconto do ciclo aplicado, arredondado.
    Usado pelo card de plano (PricingSlide) e pelo total consolidado (via
    EstimateProvider). */
export const discountedMonthlyPrice = (monthlyPrice: number, discount: number) =>
  Math.round(monthlyPrice * (1 - discount));

/** Ciclo vigente pra uma quantidade de meses contratados: o desconto é a
    contrapartida do compromisso, então 6 meses caem no semestral e 12 no anual
    sozinhos. Vence o ciclo de maior piso que os meses alcançam; abaixo do
    primeiro piso (0 meses) cai no ciclo base. */
export const cycleForMonths = (cycles: BillingCycle[], months: number): BillingCycle =>
  cycles.reduce(
    (best, c) => (months >= c.minMonths && c.minMonths >= best.minMonths ? c : best),
    cycles[0],
  );
