"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { billingCycles, plans, type BillingCycle } from "@/content/deck";
import { discountedMonthlyPrice } from "@/lib/pricing";

/** Totais publicados pela Calculadora e consumidos por outras seções da
    apresentação (hoje: TotalEstimado, pra compor o "Total consolidado" imagens +
    plataforma). Vive em Context pra evitar prop drilling entre seções
    irmãs em page.tsx sem forçar um refactor de "lift state up" completo. */
export type EstimateTotals = {
  imageCount: number;
  imageCost: number;
};

const defaultTotals: EstimateTotals = { imageCount: 0, imageCost: 0 };

/** Simulador de planos: meses por tier + ciclo de cobrança. Mora aqui (e não no
    CTA) porque o CTA edita esses valores enquanto o TotalEstimado — que virou
    seção separada, depois da Calculadora — só lê os derivados. */
type PlanSimulator = {
  /** Array paralelo a `planos`, meses contratados em cada plano. */
  months: number[];
  setMonths: (updater: (prev: number[]) => number[]) => void;
  cycle: BillingCycle;
  setCycle: (c: BillingCycle) => void;
  /** Σ meses × preço mensal do tier já com o desconto do ciclo. */
  platformCost: number;
  /** Σ meses de todos os tiers — alimenta o hint "N meses de operação Nuki". */
  totalMonths: number;
  /** custoImagens (Calculadora) + custoPlataforma. */
  grandTotal: number;
};

const EstimateContext = createContext<
  {
    totals: EstimateTotals;
    setTotals: (t: EstimateTotals) => void;
  } & PlanSimulator
>({
  totals: defaultTotals,
  setTotals: () => {},
  months: [],
  setMonths: () => {},
  cycle: billingCycles[0],
  setCycle: () => {},
  platformCost: 0,
  totalMonths: 0,
  grandTotal: 0,
});

export function EstimateProvider({ children }: { children: ReactNode }) {
  const [totals, setTotals] = useState<EstimateTotals>(defaultTotals);

  /* Meses contratados por plano — começa em 0 (o user preenche no CTA). */
  const [months, setMonths] = useState<number[]>(() => plans.map(() => 0));

  /* Ciclo de cobrança selecionado — o desconto reduz o preço mensal exibido e
     alimenta o simulador + total consolidado. Default: Mensal (0%). */
  const [cycle, setCycle] = useState<BillingCycle>(billingCycles[0]);

  const platformCost = useMemo(
    () =>
      months.reduce(
        (acc, m, i) => acc + m * discountedMonthlyPrice(plans[i]?.monthlyPrice ?? 0, cycle.discount),
        0,
      ),
    [months, cycle.discount],
  );
  const totalMonths = useMemo(() => months.reduce((a, b) => a + b, 0), [months]);
  const grandTotal = totals.imageCost + platformCost;

  const value = useMemo(
    () => ({
      totals,
      setTotals,
      months,
      setMonths,
      cycle,
      setCycle,
      platformCost,
      totalMonths,
      grandTotal,
    }),
    [totals, months, cycle, platformCost, totalMonths, grandTotal],
  );

  return (
    <EstimateContext.Provider value={value}>{children}</EstimateContext.Provider>
  );
}

/** Acesso único ao estado do orçamento. Antes eram dois hooks
    (`useCalculadoraTotals` / `usePlanoSimulador`) lendo exatamente o mesmo
    Context — o açúcar semântico prometia uma separação que não existia, já que
    ambos re-renderizavam a cada mudança. Se a performance vier a importar, o
    caminho é dividir em contexts de estado e dispatch, não em dois aliases. */
export function useEstimate() {
  return useContext(EstimateContext);
}
