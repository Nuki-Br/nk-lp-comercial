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
    | "empty-deck";
  /** pt-BR, because stage 3 shows this to a salesperson. */
  message: string;
  /** The node or field at fault, when there is one. */
  at?: string;
};

export type ValidationResult = { ok: true } | { ok: false; issues: ValidationIssue[] };

export function validateDeckConfig(config: DeckConfig): ValidationResult {
  const issues: ValidationIssue[] = [];
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

  /* ---- Money ---- */

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

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
