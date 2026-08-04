"use client";

import { useEstimate } from "@/components/deck/EstimateProvider";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/format";

/**
 * Frame de fechamento da apresentação — consolida o que o prospect configurou
 * nas duas seções anteriores: o setup de imagens (`#calculadora`) e os meses de
 * plataforma por tier (`#cta`). Só lê; nada é editável aqui.
 *
 * Vive depois da Calculadora de propósito: é a última coisa antes do footer, e
 * o gradiente da seção costura o branco da Calculadora com o cinza do footer.
 */
export function EstimatedTotalSlide() {
  const { totals, platformCost, totalMonths, grandTotal } = useEstimate();

  const imageCostDisplay = useCountUp(totals.imageCost);
  const platformCostDisplay = useCountUp(platformCost);
  const grandTotalDisplay = useCountUp(grandTotal);

  return (
    <section className="slide estimated-total" id="total" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">Total estimado</p>
          <h2 className="reveal">
            O investimento completo do seu <em>empreendimento.</em>
          </h2>
        </div>

        <div className="estimated-total-card reveal" aria-label="Total estimado do empreendimento">
          <div className="estimated-total-grid">
            <div className="estimated-total-line">
              <span className="estimated-total-line-label">Setup de imagens</span>
              <span className="estimated-total-line-value">{formatCurrency(imageCostDisplay)}</span>
              <span className="estimated-total-line-hint">
                {totals.imageCount.toLocaleString("pt-BR")} imagens estimadas
              </span>
            </div>
            <div className="estimated-total-line">
              <span className="estimated-total-line-label">Plataforma</span>
              <span className="estimated-total-line-value">
                {formatCurrency(platformCostDisplay)}
              </span>
              <span className="estimated-total-line-hint">
                {totalMonths === 0
                  ? "configure os meses em Plano & contato"
                  : `${totalMonths} ${totalMonths === 1 ? "mês" : "meses"} de operação Nuki`}
              </span>
            </div>
            <div className="estimated-total-sum">
              <span className="estimated-total-sum-label">Total</span>
              <span className="estimated-total-sum-value">{formatCurrency(grandTotalDisplay)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
