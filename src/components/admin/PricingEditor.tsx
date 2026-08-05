"use client";

import { type ReactNode, useActionState, useState } from "react";
import {
  type PricingState,
  savePricingAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Badge } from "@/components/admin/ui/Badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/admin/ui/Card";
import { FieldLabel, Input, Textarea } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import { Switch } from "@/components/admin/ui/Switch";
import { cn } from "@/lib/cn";
import type { BillingCycle } from "@/lib/estimateTypes";
import { formatCurrency } from "@/lib/format";
import { cycleForMonths, discountedMonthlyPrice } from "@/lib/pricing";

/* Plans and billing cycles.
 *
 * The one thing this screen exists to prevent is the fraction trap. The config
 * stores `discount: 0.1` meaning 10%; a salesperson types "10". So the input is
 * a PERCENTAGE, the conversion happens once in the action, and the resulting
 * monthly price is rendered next to the field — using the same
 * `discountedMonthlyPrice` the deck uses, so what is previewed here is what the
 * client will read, not a second implementation of the same arithmetic.
 *
 * A ABA INTEIRA MORA AQUI, e não só o formulário. O painel da direita tem de ler
 * o estado ao vivo — é a única forma de "12 meses cai no Anual" ser uma coisa
 * que se vê em vez de uma coisa que se lê num parágrafo — e estado ao vivo não
 * atravessa a fronteira de volta para a página, que é um Server Component. Daí
 * o `children`: o formulário das tarifas de imagem é outra action, então entra
 * como slot na coluna da esquerda em vez de virar um segundo card solto. */

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

export function PricingEditor({
  id,
  initialPlans,
  initialCycles,
  initialMaxMonths,
  snapshotStale,
  previewHref,
  children,
}: {
  id: string;
  initialPlans: PlanDraft[];
  initialCycles: CycleDraft[];
  initialMaxMonths: number;
  snapshotStale: boolean;
  /** A prévia, ancorada no slide de planos. */
  previewHref: string;
  /** O formulário de tarifas de imagem — outra action, mesma coluna. */
  children?: ReactNode;
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        {snapshotStale && <UnpublishedChangesBanner id={id} />}

        <Card>
          <CardHeader
            title="Planos e ciclos"
            description="O que o cliente vê no slide de planos e no simulador de meses."
          />
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="state" value={payload} />

            <CardContent className="flex flex-col gap-7">
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Planos</legend>
                <GroupTitle>Planos</GroupTitle>

                {/* Duas colunas: os planos são lidos em comparação um com o
                    outro, aqui e no deck. Empilhados, comparar custa rolagem. */}
                <div className="grid gap-3 md:grid-cols-2">
                  {plans.map((plan, index) => (
                    <div
                      key={`plan-${index}`}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                        /* O plano destacado é o que o cliente lê primeiro, e é o
                           que o simulador usa como base. Vale um anel. */
                        plan.featured
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                          Plano {index + 1}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          Destaque
                          <Switch
                            checked={plan.featured}
                            onChange={(featured) => patchPlan(index, { featured })}
                            label={`Destacar o plano ${plan.n || index + 1}`}
                          />
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <FieldLabel label="Nome" className="min-w-[8rem] flex-1">
                          <Input
                            value={plan.n}
                            onChange={(e) => patchPlan(index, { n: e.target.value })}
                          />
                        </FieldLabel>
                        <FieldLabel label="Mensalidade (R$)" className="w-36">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={plan.monthlyPrice}
                            onChange={(e) =>
                              patchPlan(index, {
                                monthlyPrice: Math.trunc(Number(e.target.value) || 0),
                              })
                            }
                          />
                        </FieldLabel>
                      </div>

                      <FieldLabel
                        label="Itens inclusos — um por linha"
                        hint={`${plan.items.length} ${plan.items.length === 1 ? "item" : "itens"}`}
                      >
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
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Ciclos de cobrança</legend>
                <GroupTitle hint="O desconto é a contrapartida do compromisso: o ciclo é decidido pelos meses contratados, não por um botão. “Meses mínimos” é o piso que ativa cada faixa, e a ordem não importa — o sistema ordena ao salvar.">
                  Ciclos de cobrança
                </GroupTitle>

                {cycles.map((cycle, index) => {
                  const discounted = discountedMonthlyPrice(
                    referencePrice,
                    cycle.discountPercent / 100,
                  );
                  return (
                    <div
                      key={`cycle-${index}`}
                      className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(7rem,1fr)_6.5rem_7.5rem] sm:items-end"
                    >
                      <FieldLabel label="Rótulo">
                        <Input
                          value={cycle.label}
                          onChange={(e) => patchCycle(index, { label: e.target.value })}
                        />
                      </FieldLabel>
                      <FieldLabel label="Desconto (%)">
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
                      <FieldLabel label="Meses mínimos">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={cycle.minMonths}
                          onChange={(e) =>
                            patchCycle(index, {
                              minMonths: Math.trunc(Number(e.target.value) || 0),
                            })
                          }
                        />
                      </FieldLabel>

                      {/* The whole point of the percentage input: the
                          consequence, in reais, before anyone saves it. */}
                      <p className="text-sm text-muted-foreground sm:col-span-3">
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
                  Base do simulador
                  <Badge tone="neutral" dot={false}>
                    {formatCurrency(referencePrice)}/mês
                  </Badge>
                </span>
              }
            >
              <SubmitButton label="Salvar planos e ciclos" pendingLabel="Salvando…" />
            </CardFooter>
          </form>
        </Card>

        {children}
      </div>

      {/* Numa coluna só o painel vem PRIMEIRO: empurrado para depois de um
          formulário longo, a consequência do que se digita fica a uma rolagem
          de distância, que é a mesma distância de antes de ele existir. */}
      <aside className="order-first lg:order-none lg:sticky lg:top-[10.5rem]">
        <ClientView plans={plans} cycles={cycles} maxMonths={maxMonths} previewHref={previewHref} />
      </aside>
    </div>
  );
}

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

/** O simulador do cliente, ao vivo.
 *
 * Existe porque a regra que este formulário configura — "o cliente não escolhe
 * o ciclo, ele escolhe meses e o desconto vem junto" — é invisível num campo de
 * porcentagem. Aqui ela é uma barra que se arrasta.
 *
 * Roda `cycleForMonths` e `discountedMonthlyPrice`, as MESMAS funções do deck.
 * Uma segunda implementação da regra aqui seria uma segunda regra, e a que o
 * cliente vê continuaria sendo a outra. */
function ClientView({
  plans,
  cycles,
  maxMonths,
  previewHref,
}: {
  plans: PlanDraft[];
  cycles: CycleDraft[];
  maxMonths: number;
  previewHref: string;
}) {
  const [months, setMonths] = useState(12);
  /* Derivado em vez de corrigido num efeito: baixar o teto para 6 com a barra em
     12 tem de ler 6 no mesmo render, não no seguinte. */
  const contracted = Math.min(Math.max(months, 1), Math.max(maxMonths, 1));

  /* Ordenado como a action ordena. `cycleForMonths` semeia o reduce em
     `cycles[0]` e só sobe de piso, então a ORDEM do array é lógica de preço —
     ADR 19. Sem esta linha o painel mostraria um ciclo e o cliente veria outro
     assim que a lista fosse digitada fora de ordem. */
  const ordered: BillingCycle[] = [...cycles]
    .sort((a, b) => a.minMonths - b.minMonths)
    .map((cycle) => ({
      id: cycle.id,
      label: cycle.label,
      discount: cycle.discountPercent / 100,
      minMonths: cycle.minMonths,
    }));

  const active = ordered.length > 0 ? cycleForMonths(ordered, contracted) : null;

  return (
    <Card>
      <CardHeader
        title="O que o cliente vê"
        description="Arraste os meses. O ciclo não é escolhido — ele cai sozinho."
      />
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Meses contratados</span>
            <span className="text-lg font-semibold tabular-nums">{contracted}</span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(maxMonths, 1)}
            step={1}
            value={contracted}
            onChange={(e) => setMonths(Number(e.target.value))}
            aria-label="Meses contratados no simulador"
            className="w-full accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>1</span>
            <span>{Math.max(maxMonths, 1)}</span>
          </div>
        </div>

        {active ? (
          <>
            <div className="flex items-center gap-2">
              <Badge tone="brand" dot={false}>
                {active.label}
              </Badge>
              <span className="text-sm text-muted-foreground tabular-nums">
                {active.discount > 0
                  ? `−${Math.round(active.discount * 100)}% sobre a mensalidade`
                  : "sem desconto"}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {plans.map((plan, index) => {
                const final = discountedMonthlyPrice(plan.monthlyPrice, active.discount);
                return (
                  <li
                    key={`view-${index}`}
                    className={cn(
                      "flex items-baseline justify-between gap-3 rounded-md border px-3 py-2",
                      plan.featured ? "border-primary/40 bg-primary/5" : "border-border",
                    )}
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {plan.n || `Plano ${index + 1}`}
                    </span>
                    <span className="shrink-0 text-right">
                      {final !== plan.monthlyPrice && (
                        <s className="mr-1.5 text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(plan.monthlyPrice)}
                        </s>
                      )}
                      <strong className="text-sm font-semibold tabular-nums">
                        {formatCurrency(final)}
                      </strong>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem ciclos configurados — o simulador não abre.
          </p>
        )}

        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
        >
          Ver o slide na prévia <span aria-hidden="true">↗</span>
        </a>
      </CardContent>
    </Card>
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
