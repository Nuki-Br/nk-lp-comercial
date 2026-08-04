/** Preço mensal do plano já com o desconto do ciclo aplicado, arredondado.
    Usado pelo card de plano (PricingSlide) e pelo total consolidado (via
    EstimateProvider). */
export const discountedMonthlyPrice = (monthlyPrice: number, discount: number) =>
  Math.round(monthlyPrice * (1 - discount));
