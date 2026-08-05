"use client";

import { useEstimate } from "@/components/deck/EstimateProvider";
import { SectionHead } from "@/components/slides/SectionHead";
import type { TotalNode } from "@/deck/types";
import { useCountUp } from "@/hooks/useCountUp";
import { fill, formatCurrency } from "@/lib/format";

/**
 * Frame de fechamento — consolida o que o prospect configurou nas duas seções
 * anteriores: o setup de imagens (`#calculator`) e os meses de plataforma
 * (`#pricing`). Só lê; nada é editável aqui.
 *
 * Vive depois da Calculadora de propósito: é a última coisa antes do footer, e
 * o gradiente da seção costura o branco da Calculadora com o cinza do footer.
 */
export function EstimatedTotalSlide({ node }: { node: TotalNode }) {
  const { totals, platformCost, totalMonths, grandTotal } = useEstimate();
  const { labels } = node;

  const imageCostDisplay = useCountUp(totals.imageCost);
  const platformCostDisplay = useCountUp(platformCost);
  const grandTotalDisplay = useCountUp(grandTotal);

  return (
    <section
      className="slide estimated-total"
      id={node.id}
      data-tone={node.tone}
      data-reveal-group=""
    >
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="estimated-total-card reveal" aria-label={labels.cardAria}>
          <div className="estimated-total-grid">
            <div className="estimated-total-line">
              <span className="estimated-total-line-label">{labels.imageSetup}</span>
              <span className="estimated-total-line-value">{formatCurrency(imageCostDisplay)}</span>
              <span className="estimated-total-line-hint">
                {fill(labels.imagesHintTemplate, {
                  count: totals.imageCount.toLocaleString("pt-BR"),
                })}
              </span>
            </div>
            <div className="estimated-total-line">
              <span className="estimated-total-line-label">{labels.platform}</span>
              <span className="estimated-total-line-value">
                {formatCurrency(platformCostDisplay)}
              </span>
              <span className="estimated-total-line-hint">
                {totalMonths === 0
                  ? labels.noMonthsHint
                  : fill(labels.monthsHintTemplate, {
                      months: totalMonths,
                      unit: totalMonths === 1 ? labels.monthOne : labels.monthOther,
                    })}
              </span>
            </div>
            <div className="estimated-total-sum">
              <span className="estimated-total-sum-label">{labels.total}</span>
              <span className="estimated-total-sum-value">{formatCurrency(grandTotalDisplay)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
