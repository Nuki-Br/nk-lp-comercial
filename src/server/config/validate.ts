import "server-only";

import type { DeckConfig } from "@/deck/types";

/* The validator that REJECTS.

   `normalizeDeck` is the tolerant one: it warns and repairs, because a live
   pitch must not 500 over a config a rollback made strange. This runs at the
   other end — before a write, where refusing costs nothing and a silent repair
   would hide an admin's mistake until a client is looking at the result.

   Same facts, opposite posture, and that is the whole reason there are two.
   docs/stages/README.md states the split; docs/testing.md lists what must be
   rejected here. */

export type ValidationIssue = {
  /** Stable, greppable, and safe to branch on. */
  code:
    | "duplicate-id"
    | "orphan-child"
    | "total-before-calculator"
    | "negative-price"
    | "discount-out-of-range"
    | "invalid-max-months"
    | "empty-deck"
    | "no-billing-cycles"
    | "cycles-out-of-order"
    /* Warnings. Same shape, different array — see ValidationResult. */
    | "total-without-pricing"
    | "no-plans";
  /** pt-BR, because stage 3 shows this to a salesperson. */
  message: string;
  /** The node or field at fault, when there is one. */
  at?: string;
};

/**
 * Two channels, because two of stage 3's rules are genuinely different rules.
 *
 * `issues` block the write. `warnings` do not: disabling `pricing` while `total`
 * is enabled produces a total with no platform cost, which is odd and is
 * sometimes exactly what a salesperson wants. Refusing to save it would be this
 * validator deciding a commercial question.
 *
 * `warnings` is present on BOTH arms on purpose — a caller that narrows on
 * `ok === false` must still be able to surface them, and a union that only
 * carried them on success would quietly drop them on the path where the admin is
 * already looking at the form.
 */
export type ValidationResult =
  | { ok: true; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[]; warnings: ValidationIssue[] };

export function validateDeckConfig(config: DeckConfig): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { slides, estimate } = config;

  /* ---- Structure ---- */

  const seen = new Set<string>();
  for (const node of slides) {
    if (seen.has(node.id)) {
      issues.push({
        code: "duplicate-id",
        at: node.id,
        message: `Dois slides usam o id "${node.id}".`,
      });
    }
    seen.add(node.id);
  }

  const enabled = slides.filter((n) => n.enabled);
  if (enabled.length === 0) {
    issues.push({ code: "empty-deck", message: "A proposta não tem nenhum slide ativo." });
  }

  /* The demo slide borrows the Inspetor's nav dot via data-nav-id, because it
     has none of its own. Keep the demo while hiding its parent and the progress
     nav points at an element that does not exist — every dot goes dark, and
     nothing throws. normalizeDeck drops the orphan; here we refuse to save it,
     so the admin finds out while they can still fix it. */
  const enabledIds = new Set(enabled.map((n) => n.id));
  for (const node of enabled) {
    if (node.parentId && !enabledIds.has(node.parentId)) {
      issues.push({
        code: "orphan-child",
        at: node.id,
        message: `"${node.label}" depende de "${node.parentId}", que está desativado.`,
      });
    }
  }

  /* The closing frame reads what the calculator publishes. Reversed, it reads
     zeros — in front of the client, on the slide that states the price. */
  const order = enabled.map((n) => n.id);
  const calculator = order.indexOf("calculator");
  const total = order.indexOf("total");
  if (calculator !== -1 && total !== -1 && total < calculator) {
    issues.push({
      code: "total-before-calculator",
      at: "total",
      message: 'O slide de total vem antes da calculadora e mostraria "R$ 0".',
    });
  }

  /* A WARNING, not a refusal. The closing frame adds image cost to platform
     cost; with no pricing slide the client never contracts months, so the
     platform half is zero and the total states only the image setup. That is a
     defensible proposal — images-only, plan discussed elsewhere — so this
     reports and gets out of the way. */
  if (total !== -1 && order.indexOf("pricing") === -1) {
    warnings.push({
      code: "total-without-pricing",
      at: "total",
      message:
        "O slide de planos está desativado, então o total fechará só com o setup de imagens, sem mensalidade.",
    });
  }

  /* ---- Money ---- */

  if (estimate.plans.length === 0) {
    warnings.push({
      code: "no-plans",
      at: "plans",
      message: "A proposta não tem nenhum plano, então o slide de planos abre sem card de preço.",
    });
  }

  for (const [index, plan] of estimate.plans.entries()) {
    if (!(plan.monthlyPrice >= 0) || !Number.isFinite(plan.monthlyPrice)) {
      issues.push({
        code: "negative-price",
        at: `plans[${index}].monthlyPrice`,
        message: `O plano "${plan.n}" tem preço mensal inválido.`,
      });
    }
  }

  for (const key of ["base", "option"] as const) {
    const price = estimate.imagePrices[key];
    if (!(price >= 0) || !Number.isFinite(price)) {
      issues.push({
        code: "negative-price",
        at: `imagePrices.${key}`,
        message: `A tarifa de imagem "${key}" é inválida.`,
      });
    }
  }

  /* `cycleForMonths` reduces with `cycles[0]` as the seed, so an empty list
     returns `undefined` and the very next read — `cycle.discount` in
     EstimateProvider — throws. This is the one config mistake in this file that
     does not degrade into a wrong number: it is a blank page. */
  if (estimate.billingCycles.length === 0) {
    issues.push({
      code: "no-billing-cycles",
      at: "billingCycles",
      message: "A proposta precisa de pelo menos um ciclo de cobrança.",
    });
  }

  /* Ascending order is a CORRECTNESS requirement, not a tidiness one, and ADR 19
     is why: the cycle is derived from the contracted months, and the reduce that
     derives it seeds on `cycles[0]` and only ever moves to a HIGHER floor. Put
     the annual cycle first and one contracted month is quoted at −10%, on the
     same frame the prospect is reading. Same reason the first floor must be 1 or
     lower: below it, nothing matches and the seed wins by default. */
  const floors = estimate.billingCycles.map((c) => c.minMonths);
  const ascending = floors.every((m, i) => i === 0 || m > floors[i - 1]);
  if (floors.length > 0 && (!ascending || floors[0] > 1)) {
    issues.push({
      code: "cycles-out-of-order",
      at: "billingCycles",
      message:
        "Os ciclos precisam estar em ordem crescente de meses mínimos, começando em 1 mês ou menos — fora disso um contrato curto sai com o desconto do ciclo longo.",
    });
  }

  /* A discount is a fraction. At 1 the price is zero; above it, the estimate
     goes negative and the closing frame quotes the client a refund. */
  for (const [index, cycle] of estimate.billingCycles.entries()) {
    if (!Number.isFinite(cycle.discount) || cycle.discount < 0 || cycle.discount >= 1) {
      issues.push({
        code: "discount-out-of-range",
        at: `billingCycles[${index}].discount`,
        message: `O desconto de "${cycle.label}" precisa estar entre 0 e 1 (exclusivo).`,
      });
    }
  }

  if (!Number.isInteger(estimate.maxMonths) || estimate.maxMonths <= 0) {
    issues.push({
      code: "invalid-max-months",
      at: "maxMonths",
      message: "O prazo máximo precisa ser um número inteiro de meses maior que zero.",
    });
  }

  return issues.length === 0 ? { ok: true, warnings } : { ok: false, issues, warnings };
}
