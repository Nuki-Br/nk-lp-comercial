"use client";

import { useActionState, useState } from "react";
import {
  type PricingState,
  savePricingAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Badge } from "@/components/admin/ui/Badge";
import { CardContent, CardFooter } from "@/components/admin/ui/Card";
import { Checkbox, FieldLabel, Input, Textarea } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import { cn } from "@/lib/cn";
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

/** Título de um bloco dentro do card. Não é `CardHeader`: o card já tem um, e
    dois `<h2>` na mesma seção seriam dois títulos para uma coisa só. */
function GroupTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {hint && (
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
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
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={payload} />

      <CardContent className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Planos</legend>
          <GroupTitle>Planos</GroupTitle>

          {plans.map((plan, index) => (
            <div
              key={`plan-${index}`}
              className={cn(
                "flex flex-col gap-3 rounded-md border p-4 transition-colors",
                /* O plano destacado é o que o cliente lê primeiro, e é o que o
                   preview de desconto usa como base. Vale um anel. */
                plan.featured ? "border-primary/40 bg-primary/5" : "border-border",
              )}
            >
              <div className="flex flex-wrap gap-3">
                <FieldLabel label="Nome" className="min-w-[12rem] flex-1">
                  <Input value={plan.n} onChange={(e) => patchPlan(index, { n: e.target.value })} />
                </FieldLabel>
                <FieldLabel label="Mensalidade (R$)" className="w-40">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={plan.monthlyPrice}
                    onChange={(e) =>
                      patchPlan(index, { monthlyPrice: Math.trunc(Number(e.target.value) || 0) })
                    }
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Itens inclusos — um por linha">
                <Textarea
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
              </FieldLabel>

              <Checkbox
                label="Destacar este plano"
                checked={plan.featured}
                onChange={(e) => patchPlan(index, { featured: e.target.checked })}
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Ciclos de cobrança</legend>
          <GroupTitle hint="O desconto é a contrapartida do compromisso: o ciclo é decidido pelos meses contratados, não por um botão. “Meses mínimos” é o piso que ativa cada faixa.">
            Ciclos de cobrança
          </GroupTitle>

          {cycles.map((cycle, index) => {
            const discounted = discountedMonthlyPrice(referencePrice, cycle.discountPercent / 100);
            return (
              <div
                key={`cycle-${index}`}
                className="flex flex-wrap items-end gap-3 rounded-md border border-border p-4"
              >
                <FieldLabel label="Rótulo" className="min-w-[10rem] flex-1">
                  <Input
                    value={cycle.label}
                    onChange={(e) => patchCycle(index, { label: e.target.value })}
                  />
                </FieldLabel>
                <FieldLabel label="Desconto (%)" className="w-32">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    value={cycle.discountPercent}
                    onChange={(e) =>
                      patchCycle(index, { discountPercent: Number(e.target.value) || 0 })
                    }
                  />
                </FieldLabel>
                <FieldLabel label="Meses mínimos" className="w-32">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={cycle.minMonths}
                    onChange={(e) =>
                      patchCycle(index, { minMonths: Math.trunc(Number(e.target.value) || 0) })
                    }
                  />
                </FieldLabel>

                {/* The whole point of the percentage input: the consequence, in
                    reais, before anyone saves it. */}
                <p className="min-w-[13rem] flex-1 pb-2 text-sm text-muted-foreground">
                  {formatCurrency(referencePrice)} vira{" "}
                  <strong className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(discounted)}
                  </strong>{" "}
                  por mês
                </p>
              </div>
            );
          })}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Simulador</legend>
          <GroupTitle hint="O maior número de meses que o cliente consegue arrastar no simulador.">
            Simulador
          </GroupTitle>
          <FieldLabel label="Teto do simulador (meses)" className="w-52">
            <Input
              type="number"
              min={1}
              max={120}
              step={1}
              value={maxMonths}
              onChange={(e) => setMaxMonths(Math.trunc(Number(e.target.value) || 1))}
            />
          </FieldLabel>
        </fieldset>

        <Feedback state={state} />
      </CardContent>

      <CardFooter
        hint={
          <span className="inline-flex items-center gap-2">
            Base do preview
            <Badge tone="neutral" dot={false}>
              {formatCurrency(referencePrice)}/mês
            </Badge>
          </span>
        }
      >
        <SubmitButton label="Salvar planos e ciclos" pendingLabel="Salvando…" />
      </CardFooter>
    </form>
  );
}

/** O bloco de retorno das Server Functions de preço. Exportado porque
    `ImagePricesForm` fala o mesmo `PricingState` e mostra o mesmo retorno. */
export function Feedback({ state }: { state: PricingState }) {
  if (!state.error && !state.notice && !state.issues.length && !state.warnings.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <AlertList tone="danger" items={state.issues} />
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      {state.notice && (
        <Alert tone="success" live>
          {state.notice}
        </Alert>
      )}
      <AlertList tone="warning" items={state.warnings} live={false} />
    </div>
  );
}
