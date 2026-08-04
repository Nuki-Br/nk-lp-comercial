"use client";

import { plans, billingCycles } from "@/content/deck";
import { Stepper } from "@/components/ui/Stepper";
import { formatCurrency } from "@/lib/format";
import { discountedMonthlyPrice } from "@/lib/pricing";
import { useEstimate } from "@/components/deck/EstimateProvider";

const MAX_MONTHS = 24;

export function PricingSlide() {
  /* Meses/ciclo vivem no CalculadoraProvider — o CTA edita, a seção
     #total (TotalEstimado, depois da Calculadora) lê os derivados. */
  const { months, setMonths, cycle, setCycle } = useEstimate();

  const updateMeses = (idx: number, v: number) => {
    setMonths((prev) => prev.map((m, i) => (i === idx ? v : m)));
  };

  return (
    <section className="slide pricing" id="pricing" data-tone="dark" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">Plano & contato</p>
          <h2 className="reveal">
            Todos os módulos em <em>um plano só</em>.
          </h2>
          <p className="lead reveal">
            Fee mensal por empreendimento ativo, com Planner, Personaliza e Inspetor inclusos desde o primeiro mês. Simule por quantos meses o empreendimento fica na plataforma.
          </p>
        </div>

        <div className="billing-cycle-toggle reveal" role="tablist" aria-label="Ciclo de cobrança">
          {billingCycles.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cycle.id}
              className={`billing-cycle-btn${c.id === cycle.id ? " is-active" : ""}`}
              onClick={() => setCycle(c)}
            >
              {c.label}
              {c.discount > 0 && (
                <span className="billing-cycle-off">−{Math.round(c.discount * 100)}%</span>
              )}
            </button>
          ))}
        </div>

        <div className="plans">
          {plans.map((p, i) => {
            const finalMonthlyPrice = discountedMonthlyPrice(p.monthlyPrice, cycle.discount);
            const subtotal = (months[i] ?? 0) * finalMonthlyPrice;
            return (
              <article className={`plan reveal${p.featured ? " is-featured" : ""}`} key={p.n}>
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
                  <span className="price-value">{formatCurrency(finalMonthlyPrice)}/mês</span>
                  <span className="price-unit">
                    por empreendimento
                    {cycle.discount > 0 && (
                      <span className="price-badge">
                        −{Math.round(cycle.discount * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="plan-simulator">
                  <span className="plan-simulator-label">Meses na plataforma</span>
                  <Stepper
                    value={months[i] ?? 0}
                    min={0}
                    max={MAX_MONTHS}
                    onChange={(v) => updateMeses(i, v)}
                    ariaLabel={`Meses no ${p.n}`}
                  />
                  <span className={`plan-simulator-sub${(months[i] ?? 0) > 0 ? " is-active" : ""}`}>
                    {(months[i] ?? 0) > 0 ? formatCurrency(subtotal) : "—"}
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
