"use client";

import { useEstimate } from "@/components/deck/EstimateProvider";
import { SectionHead } from "@/components/slides/SectionHead";
import { Stepper } from "@/components/ui/Stepper";
import type { EstimateConfig, PricingNode } from "@/deck/types";
import { fill, formatCurrency } from "@/lib/format";
import { discountedMonthlyPrice } from "@/lib/pricing";

export function PricingSlide({ node, estimate }: { node: PricingNode; estimate: EstimateConfig }) {
  /* Meses/ciclo vivem no EstimateProvider — o CTA edita, a seção #total lê os
     derivados. O `cycle` vem derivado dos meses: subir o stepper até 6 já
     acende o Semestral aqui. */
  const { months, setMonths, cycle, selectCycle } = useEstimate();
  const { labels } = node;

  const updateMeses = (idx: number, v: number) => {
    setMonths((prev) => prev.map((m, i) => (i === idx ? v : m)));
  };

  return (
    <section className="slide pricing" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div
          className="billing-cycle-toggle reveal"
          role="tablist"
          aria-label={labels.cycleTabsAria}
        >
          {estimate.billingCycles.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cycle.id}
              className={`billing-cycle-btn${c.id === cycle.id ? " is-active" : ""}`}
              onClick={() => selectCycle(c)}
            >
              {c.label}
              {c.discount > 0 && (
                <span className="billing-cycle-off">−{Math.round(c.discount * 100)}%</span>
              )}
            </button>
          ))}
        </div>

        <p className="billing-cycle-hint reveal">{labels.cycleHint}</p>

        <div className="plans">
          {estimate.plans.map((p, i) => {
            const finalMonthlyPrice = discountedMonthlyPrice(p.monthlyPrice, cycle.discount);
            const subtotal = (months[i] ?? 0) * finalMonthlyPrice;
            /* Chave por POSIÇÃO, não pelo nome. O compositor agora adiciona
               planos, então dois cards com o mesmo nome deixaram de ser
               hipótese — e por posição um plano renomeado mantém o mesmo nó,
               que é o que o observer de `.reveal` precisa para não perder o
               `is-visible` de um card já revelado. `months[i]` já indexava por
               posição. */
            return (
              <article
                className={`plan reveal${p.featured ? " is-featured" : ""}`}
                key={`plan-${i}`}
              >
                <span className="n">{p.n}</span>
                <ul>
                  {p.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <div className="price">
                  {cycle.discount > 0 && (
                    <span className="price-original">{formatCurrency(p.monthlyPrice)}</span>
                  )}
                  <span className="price-value">
                    {formatCurrency(finalMonthlyPrice)}
                    {labels.priceSuffix}
                  </span>
                  <span className="price-unit">
                    {labels.priceUnit}
                    {cycle.discount > 0 && (
                      <span className="price-badge">−{Math.round(cycle.discount * 100)}%</span>
                    )}
                  </span>
                </div>
                <div className="plan-simulator">
                  <span className="plan-simulator-label">{labels.monthsLabel}</span>
                  <Stepper
                    value={months[i] ?? 0}
                    min={0}
                    max={estimate.maxMonths}
                    onChange={(v) => updateMeses(i, v)}
                    ariaLabel={fill(labels.monthsAriaTemplate, { plan: p.n })}
                  />
                  <span className={`plan-simulator-sub${(months[i] ?? 0) > 0 ? " is-active" : ""}`}>
                    {(months[i] ?? 0) > 0 ? formatCurrency(subtotal) : labels.emptySubtotal}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
