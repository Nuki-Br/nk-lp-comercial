"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type PricingState,
  savePricingAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { formatCurrency } from "@/lib/format";
import { discountedMonthlyPrice } from "@/lib/pricing";

/* Plans and billing cycles.
 *
 * The one thing this screen exists to prevent is the fraction trap. The config
 * stores `discount: 0.1` meaning 10%; a salesperson types "10". So the input is
 * a PERCENTAGE, the conversion happens once in the action, and the resulting
 * monthly price is rendered next to the field — using the same
 * `discountedMonthlyPrice` the deck uses, so what is previewed here is what the
 * client will read, not a second implementation of the same arithmetic. */

export type PlanDraft = {
  n: string;
  items: string[];
  monthlyPrice: number;
  featured: boolean;
};

export type CycleDraft = {
  id: string;
  label: string;
  /** Percent, as typed. The action converts. */
  discountPercent: number;
  minMonths: number;
};

const EMPTY: PricingState = { error: null, notice: null, issues: [], warnings: [] };

const field =
  "rounded-xl border border-nuki-gray-border bg-nuki-white px-3 py-2 outline-none focus:border-nuki-green-02";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-nuki-gray-7";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar planos e ciclos"}
    </button>
  );
}

export function PricingEditor({
  id,
  initialPlans,
  initialCycles,
  initialMaxMonths,
}: {
  id: string;
  initialPlans: PlanDraft[];
  initialCycles: CycleDraft[];
  initialMaxMonths: number;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [cycles, setCycles] = useState(initialCycles);
  const [maxMonths, setMaxMonths] = useState(initialMaxMonths);
  const [state, action] = useActionState<PricingState, FormData>(savePricingAction, EMPTY);

  const patchPlan = (index: number, patch: Partial<PlanDraft>) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const patchCycle = (index: number, patch: Partial<CycleDraft>) => {
    setCycles((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  /** The headline price the preview is computed against. With one plan this is
      that plan; with tiers it is the featured one, which is the number a
      prospect reads first. */
  const referencePrice = (plans.find((p) => p.featured) ?? plans[0])?.monthlyPrice ?? 0;

  const payload = JSON.stringify({ plans, billingCycles: cycles, maxMonths });

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={payload} />

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Planos
        </legend>

        {plans.map((plan, index) => (
          <div
            key={`plan-${index}`}
            className="flex flex-col gap-3 rounded-xl border border-nuki-gray-border p-4"
          >
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <span className={labelClass}>Nome</span>
                <input
                  className={field}
                  value={plan.n}
                  onChange={(e) => patchPlan(index, { n: e.target.value })}
                />
              </label>
              <label className="flex w-40 flex-col gap-1">
                <span className={labelClass}>Mensalidade (R$)</span>
                <input
                  className={field}
                  type="number"
                  min={0}
                  step={1}
                  value={plan.monthlyPrice}
                  onChange={(e) =>
                    patchPlan(index, { monthlyPrice: Math.trunc(Number(e.target.value) || 0) })
                  }
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Itens inclusos — um por linha</span>
              <textarea
                className={`${field} min-h-24`}
                value={plan.items.join("\n")}
                onChange={(e) =>
                  patchPlan(index, {
                    items: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-nuki-gray-mid">
              <input
                type="checkbox"
                checked={plan.featured}
                onChange={(e) => patchPlan(index, { featured: e.target.checked })}
              />
              Destacar este plano
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Ciclos de cobrança
        </legend>
        <p className="text-sm text-nuki-gray-mid">
          O desconto é a contrapartida do compromisso: o ciclo é decidido pelos meses contratados,
          não por um botão. “Meses mínimos” é o piso que ativa cada faixa.
        </p>

        {cycles.map((cycle, index) => {
          const discounted = discountedMonthlyPrice(referencePrice, cycle.discountPercent / 100);
          return (
            <div
              key={`cycle-${index}`}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-nuki-gray-border p-4"
            >
              <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <span className={labelClass}>Rótulo</span>
                <input
                  className={field}
                  value={cycle.label}
                  onChange={(e) => patchCycle(index, { label: e.target.value })}
                />
              </label>
              <label className="flex w-32 flex-col gap-1">
                <span className={labelClass}>Desconto (%)</span>
                <input
                  className={field}
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={cycle.discountPercent}
                  onChange={(e) =>
                    patchCycle(index, { discountPercent: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label className="flex w-32 flex-col gap-1">
                <span className={labelClass}>Meses mínimos</span>
                <input
                  className={field}
                  type="number"
                  min={0}
                  step={1}
                  value={cycle.minMonths}
                  onChange={(e) =>
                    patchCycle(index, { minMonths: Math.trunc(Number(e.target.value) || 0) })
                  }
                />
              </label>

              {/* The whole point of the percentage input: the consequence, in
                  reais, before anyone saves it. */}
              <p className="min-w-[12rem] flex-1 text-sm text-nuki-gray-mid">
                {formatCurrency(referencePrice)} vira{" "}
                <strong className="text-nuki-black">{formatCurrency(discounted)}</strong> por mês
              </p>
            </div>
          );
        })}
      </fieldset>

      <label className="flex w-52 flex-col gap-1">
        <span className={labelClass}>Teto do simulador (meses)</span>
        <input
          className={field}
          type="number"
          min={1}
          max={120}
          step={1}
          value={maxMonths}
          onChange={(e) => setMaxMonths(Math.trunc(Number(e.target.value) || 1))}
        />
      </label>

      <Feedback state={state} />

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}

export function Feedback({ state }: { state: PricingState }) {
  if (!state.error && !state.notice && !state.issues.length && !state.warnings.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {state.issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-nuki-orange p-3">
          {state.issues.map((issue) => (
            <li key={issue} className="text-sm font-semibold text-nuki-orange">
              {issue}
            </li>
          ))}
        </ul>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-nuki-orange">
          {state.error}
        </p>
      )}
      {state.notice && <p className="text-sm font-semibold text-nuki-green-02">{state.notice}</p>}
      {state.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-nuki-gray-light p-3">
          {state.warnings.map((warning) => (
            <li key={warning} className="text-sm text-nuki-gray-mid">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
