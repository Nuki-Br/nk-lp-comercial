"use client";

import { type ReactNode, useActionState, useRef, useState } from "react";
import {
  type PricingState,
  savePricingAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/admin/ui/Card";
import { FieldLabel, Input, Textarea } from "@/components/admin/ui/Field";
import { Section, SectionActions } from "@/components/admin/ui/Section";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import { cn } from "@/lib/cn";
import { type BillingCycle, ESTIMATE_RANGES } from "@/lib/estimateTypes";
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

/** Um plano no estado do formulário: o rascunho mais uma chave de React.
 *
 * A chave existe porque a lista passou a poder encolher. Com `key={index}`,
 * remover o plano do meio faz o React reaproveitar o `<textarea>` do removido
 * para o seguinte — os valores até chegam certos, porque tudo aqui é
 * controlado, mas o cursor e a rolagem de dentro do campo pulam de plano. Ela
 * NÃO viaja para o servidor: `payloadOf` a descarta. */
type PlanRow = PlanDraft & { key: string };

const NEW_PLAN_NAME = "Novo plano";

/** Um nome que ainda não está na lista.
 *
 * Não é capricho: dois planos com o mesmo nome já foram um bug esperando
 * acontecer, e "adicionar plano" transformaria isso em um clique. O deck
 * também deixou de usar o nome como chave, então isto é a segunda camada — a
 * primeira é o vendedor ler "Novo plano 2" e renomear. */
function uniquePlanName(rows: PlanRow[]): string {
  const taken = new Set(rows.map((row) => row.n.trim()));
  if (!taken.has(NEW_PLAN_NAME)) return NEW_PLAN_NAME;
  for (let suffix = 2; suffix <= ESTIMATE_RANGES.plans.max + 1; suffix++) {
    const candidate = `${NEW_PLAN_NAME} ${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return NEW_PLAN_NAME;
}

/** O que atravessa para a action. A chave de React fica para trás. */
function payloadOf(plans: PlanRow[], cycles: CycleDraft[], maxMonths: number): string {
  return JSON.stringify({
    plans: plans.map(({ key: _key, ...plan }) => plan),
    billingCycles: cycles,
    maxMonths,
  });
}

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
  const [plans, setPlans] = useState<PlanRow[]>(() =>
    initialPlans.map((plan, index) => ({ ...plan, key: `plan-${index}` })),
  );
  const [cycles, setCycles] = useState(initialCycles);
  const [maxMonths, setMaxMonths] = useState(initialMaxMonths);
  const [state, action] = useActionState<PricingState, FormData>(savePricingAction, EMPTY);

  /* Contador de chaves, semeado depois das que já existem. Mesmo truque do
     `nextTypeId` do editor da calculadora, e pelo mesmo motivo: uma chave
     reaproveitada é um campo que troca de dono. */
  const nextPlanKey = useRef(initialPlans.length);

  const patchPlan = (index: number, patch: Partial<PlanDraft>) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addPlan = () => {
    if (plans.length >= ESTIMATE_RANGES.plans.max) return;
    setPlans((prev) => [
      ...prev,
      {
        key: `plan-${nextPlanKey.current++}`,
        n: uniquePlanName(prev),
        items: [],
        monthlyPrice: 0,
        /* Nunca em destaque ao nascer: o destaque é o card que o cliente lê
           primeiro, e dois deles é uma escolha que ninguém fez. */
        featured: false,
      },
    ]);
  };

  const removePlan = (index: number) => {
    if (plans.length <= ESTIMATE_RANGES.plans.min) return;
    setPlans((prev) => prev.filter((_, i) => i !== index));
  };

  const patchCycle = (index: number, patch: Partial<CycleDraft>) => {
    setCycles((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  /** The headline price the preview is computed against. With one plan this is
      that plan; with tiers it is the featured one, which is the number a
      prospect reads first. */
  const referencePrice = (plans.find((p) => p.featured) ?? plans[0])?.monthlyPrice ?? 0;

  const payload = payloadOf(plans, cycles, maxMonths);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {/* Mesma coluna de ajustes da Visão geral: seções sem caixa, separadas por
          um fio, e a primeira sem ele. `first-of-type` e não `first-child`
          porque o aviso de alterações não publicadas entra antes dela. */}
      <div className="flex min-w-0 flex-col gap-8 [&>section:first-of-type]:border-t-0 [&>section:first-of-type]:pt-0">
        {snapshotStale && <UnpublishedChangesBanner id={id} />}

        <Section
          title="Planos e ciclos"
          description="O que o cliente vê no slide de planos e no simulador de meses."
        >
          <form action={action} className="flex flex-col gap-7">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="state" value={payload} />
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Planos</legend>
              <GroupTitle>Planos</GroupTitle>

              {/* Um plano por faixa, e a faixa é horizontal: identificação e
                  preço à esquerda, o que está incluso à direita.
                  Empilhados em duas colunas estreitas, cada card ficava alto e
                  o `<textarea>` de itens — o campo que mais se edita aqui —
                  ganhava a menor largura da tela. */}
              <div className="flex flex-col gap-3">
                {plans.map((plan, index) => (
                  <div
                    key={plan.key}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      /* O plano destacado é o que o cliente lê primeiro, e é o
                         que o simulador usa como base. Vale um anel. */
                      plan.featured
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/20",
                    )}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <FeaturedToggle
                        featured={plan.featured}
                        planName={plan.n || `${index + 1}`}
                        onToggle={() => patchPlan(index, { featured: !plan.featured })}
                      />
                      <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                        Plano {index + 1}
                      </span>
                      {/* A estrela sozinha seria forma pura. A pílula é o mesmo
                          estado em palavra, e some quando não é o caso. */}
                      {plan.featured && (
                        <Badge tone="brand" dot={false}>
                          Destaque
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlan(index)}
                        disabled={plans.length <= ESTIMATE_RANGES.plans.min}
                        aria-label={`Remover o plano ${plan.n || index + 1}`}
                        className="ml-auto size-7 hover:text-destructive"
                      >
                        <span aria-hidden="true">×</span>
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
                      <div className="flex flex-col gap-3">
                        <FieldLabel label="Nome">
                          <Input
                            value={plan.n}
                            onChange={(e) => patchPlan(index, { n: e.target.value })}
                          />
                        </FieldLabel>
                        <FieldLabel label="Mensalidade (R$)">
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
                          /* Alto o bastante para os dois campos ao lado: a faixa
                             fecha em linha reta em vez de deixar um degrau. */
                          className="h-full min-h-[7.5rem]"
                        />
                      </FieldLabel>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPlan}
                  disabled={plans.length >= ESTIMATE_RANGES.plans.max}
                >
                  + Adicionar plano
                </Button>
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

            <SectionActions
              hint={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {plans.length} {plans.length === 1 ? "plano" : "planos"} · base do simulador
                  <Badge tone="neutral" dot={false}>
                    {formatCurrency(referencePrice)}/mês
                  </Badge>
                </span>
              }
            >
              <SubmitButton label="Salvar planos e ciclos" pendingLabel="Salvando…" />
            </SectionActions>
          </form>
        </Section>

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

/** A estrela que escolhe o plano em destaque.
 *
 * Era um interruptor com o rótulo "Destaque" ao lado, o que custava três
 * elementos no cabeçalho da faixa para uma escolha que é de um clique. Continua
 * sendo um botão de alternar de verdade: `aria-pressed` é o que um leitor de
 * tela lê como "ativado", e o rótulo diz o plano — "Destacar o plano Essencial"
 * — porque uma estrela sem nome não diz de quem ela é. */
function FeaturedToggle({
  featured,
  planName,
  onToggle,
}: {
  featured: boolean;
  planName: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={featured}
      aria-label={`Destacar o plano ${planName}`}
      title={featured ? "Plano em destaque" : "Destacar este plano"}
      onClick={onToggle}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/25",
        featured
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground/50 hover:bg-accent hover:text-foreground",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill={featured ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M8 1.75 10 6l4.25.5-3.1 2.9.85 4.35L8 11.6l-4 2.15.85-4.35L1.75 6.5 6 6l2-4.25Z" />
      </svg>
    </button>
  );
}

/** Título de um bloco dentro da seção. Não é o título da `Section`: ela já tem
    um, e dois `<h2>` na mesma seção seriam dois títulos para uma coisa só. */
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
  plans: PlanRow[];
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
                    key={plan.key}
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
