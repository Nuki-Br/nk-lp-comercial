"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

/** Totais publicados pela Calculadora e consumidos por outras seções da
    apresentação (hoje: o frame de fechamento). Vive em Context pra evitar prop
    drilling entre seções irmãs sem forçar um refactor de "lift state up"
    completo. */
export type EstimateTotals = {
  imageCount: number;
  imageCost: number;
};

const defaultTotals: EstimateTotals = { imageCount: 0, imageCost: 0 };

const EstimateContext = createContext<{
  totals: EstimateTotals;
  setTotals: (t: EstimateTotals) => void;
}>({
  totals: defaultTotals,
  setTotals: () => {},
});

export function EstimateProvider({ children }: { children: ReactNode }) {
  const [totals, setTotals] = useState<EstimateTotals>(defaultTotals);
  const value = useMemo(() => ({ totals, setTotals }), [totals]);

  return <EstimateContext.Provider value={value}>{children}</EstimateContext.Provider>;
}

/** Acesso único ao estado do orçamento: a Calculadora escreve, o frame de
    fechamento lê. Se a performance vier a importar, o caminho é dividir em
    contexts de estado e dispatch, não em dois aliases do mesmo Context. */
export function useEstimate() {
  return useContext(EstimateContext);
}
