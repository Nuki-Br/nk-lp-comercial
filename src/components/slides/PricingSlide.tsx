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
    <section className="cm-section cta" id="cta" data-tone="dark" data-reveal-group="">
      <div className="cm-wrap">
        <div className="cm-head">
          <p className="tag reveal">Plano & contato</p>
          <h2 className="reveal">
            Todos os módulos em <em>um plano só</em>.
          </h2>
          <p className="lead reveal">
            Fee mensal por empreendimento ativo, com Planner, Personaliza e Inspetor inclusos desde o primeiro mês. Simule por quantos meses o empreendimento fica na plataforma.
          </p>
        </div>

        <div className="ciclo-toggle reveal" role="tablist" aria-label="Ciclo de cobrança">
          {billingCycles.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cycle.id}
              className={`ciclo-toggle-btn${c.id === cycle.id ? " on" : ""}`}
              onClick={() => setCycle(c)}
            >
              {c.label}
              {c.discount > 0 && (
                <span className="ciclo-toggle-off">−{Math.round(c.discount * 100)}%</span>
              )}
            </button>
          ))}
        </div>

        <div className="planos">
          {plans.map((p, i) => {
            const finalMonthlyPrice = discountedMonthlyPrice(p.monthlyPrice, cycle.discount);
            const subtotal = (months[i] ?? 0) * finalMonthlyPrice;
            return (
              <article className={`plano reveal${p.featured ? " destaque" : ""}`} key={p.n}>
                <span className="n">{p.n}</span>
                <ul>
                  {p.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <div className="preco">
                  {cycle.discount > 0 && (
                    <span className="preco-antigo">{formatCurrency(p.monthlyPrice)}</span>
                  )}
                  <span className="preco-valor">{formatCurrency(finalMonthlyPrice)}/mês</span>
                  <span className="un">
                    por empreendimento
                    {cycle.discount > 0 && (
                      <span className="preco-badge">
                        −{Math.round(cycle.discount * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="cta-plano-simulador">
                  <span className="cta-plano-simulador-label">Meses na plataforma</span>
                  <Stepper
                    value={months[i] ?? 0}
                    min={0}
                    max={MAX_MONTHS}
                    onChange={(v) => updateMeses(i, v)}
                    ariaLabel={`Meses no ${p.n}`}
                  />
                  <span className={`cta-plano-simulador-sub${(months[i] ?? 0) > 0 ? " on" : ""}`}>
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
