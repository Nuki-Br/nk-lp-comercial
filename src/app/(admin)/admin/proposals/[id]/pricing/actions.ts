"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ESTIMATE_RANGES } from "@/lib/estimateTypes";
import { clamp } from "@/lib/format";
import { getAdmin } from "@/server/auth/requireAdmin";
import { saveProposalOverride } from "@/server/proposals/config";

/* Re-checks, like every other action. ADR 15. */

export type PricingState = {
  error: string | null;
  notice: string | null;
  issues: string[];
  warnings: string[];
};

const EMPTY = { error: null, notice: null, issues: [], warnings: [] };

/* THE FRACTION TRAP, converted at exactly one boundary.
 *
 * `billingCycles[].discount` is a fraction: 0.1 means 10%. content-guide.md
 * documents it and the config stores it that way, but a percentage is what a
 * salesperson types — someone entering `10` for "ten percent" would quote a
 * 1000% discount and the closing frame would offer the client a refund.
 *
 * So the form takes percent, this is the only place it becomes a fraction, and
 * the UI shows the resulting monthly price beside the input so the mistake is
 * visible before saving rather than in the meeting. */
const percentToFraction = (percent: number): number => Math.round(percent) / 100;

const pricingState = z.object({
  plans: z
    .array(
      z.object({
        n: z.string().trim().min(1).max(60),
        items: z.array(z.string().trim().min(1)).max(20),
        monthlyPrice: z.number().int().min(0).max(9_999_999),
        featured: z.boolean(),
      }),
    )
    /* Teto compartilhado com o botão "adicionar plano" do compositor. Sem piso
       de propósito: zero planos é aceito aqui e o `no-plans` do validador
       explica a consequência em uma frase que um vendedor entende, enquanto um
       `.min(1)` devolveria o "confira os campos" genérico. */
    .max(ESTIMATE_RANGES.plans.max),
  billingCycles: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(40),
        /** Percent as typed. Converted below; never stored in this unit. */
        discountPercent: z.number().min(0).max(99),
        minMonths: z.number().int().min(0).max(120),
      }),
    )
    .min(1)
    .max(6),
  maxMonths: z.number().int().min(1).max(120),
});

export async function savePricingAction(
  _prev: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const admin = await getAdmin();
  if (!admin) return { ...EMPTY, error: "Sessão expirada. Entre novamente." };

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ...EMPTY, error: "Proposta inválida." };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("state") ?? ""));
  } catch {
    return { ...EMPTY, error: "Não foi possível ler o formulário. Recarregue e tente de novo." };
  }

  const parsed = pricingState.safeParse(payload);
  if (!parsed.success) {
    return {
      ...EMPTY,
      error: "Confira os campos: nome e rótulo não podem ficar vazios, e os valores são números.",
    };
  }

  /* Sorted here rather than trusted from the form. `cycleForMonths` seeds its
     reduce on cycles[0] and only ever moves to a higher floor, so the array
     order IS the pricing logic — ADR 19. The validator rejects a bad order too;
     sorting first means the salesperson does not have to care. */
  const billingCycles = [...parsed.data.billingCycles]
    .sort((a, b) => a.minMonths - b.minMonths)
    .map((cycle) => ({
      id: cycle.id,
      label: cycle.label,
      discount: percentToFraction(cycle.discountPercent),
      minMonths: cycle.minMonths,
    }));

  const result = await saveProposalOverride(id.data, {
    estimate: {
      plans: parsed.data.plans,
      billingCycles,
      /* Clamped with the shared range rather than a second copy of the numbers.
         docs/estimate.md: ESTIMATE_RANGES stays in code because it is what stops
         an admin typo becoming an absurd quote. */
      maxMonths: clamp(parsed.data.maxMonths, 1, 120),
    },
  });

  if (!result.ok) {
    return {
      ...EMPTY,
      issues: result.issues.map((i) => i.message),
      warnings: result.warnings.map((i) => i.message),
    };
  }

  revalidatePath(`/admin/proposals/${id.data}`, "layout");
  return {
    ...EMPTY,
    notice: "Planos e ciclos salvos.",
    warnings: result.warnings.map((i) => i.message),
  };
}

const imagePrices = z.object({
  id: z.string().uuid(),
  base: z.coerce.number().int(),
  option: z.coerce.number().int(),
});

/**
 * The two tariffs behind `Ctrl+Alt+K` on `/fast`, set per proposal here.
 *
 * The panel itself does not exist on `/p/[slug]`: `forVisitor` forces
 * `chrome.allowPriceOverride` false at publish and again at render, and
 * `CalculatorSlide` never even registers the key listener. On a link that stays
 * with the client, a hidden panel exposing cost basis is a discoverable leak —
 * and this form is where the salesperson sets those numbers instead.
 */
export async function saveImagePricesAction(
  _prev: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const admin = await getAdmin();
  if (!admin) return { ...EMPTY, error: "Sessão expirada. Entre novamente." };

  const parsed = imagePrices.safeParse({
    id: formData.get("id"),
    base: formData.get("base"),
    option: formData.get("option"),
  });
  if (!parsed.success) return { ...EMPTY, error: "As tarifas precisam ser números inteiros." };

  const result = await saveProposalOverride(parsed.data.id, {
    estimate: {
      imagePrices: {
        base: clamp(
          parsed.data.base,
          ESTIMATE_RANGES.baseImagePrice.min,
          ESTIMATE_RANGES.baseImagePrice.max,
        ),
        option: clamp(
          parsed.data.option,
          ESTIMATE_RANGES.optionImagePrice.min,
          ESTIMATE_RANGES.optionImagePrice.max,
        ),
      },
    },
  });

  if (!result.ok) {
    return {
      ...EMPTY,
      issues: result.issues.map((i) => i.message),
      warnings: result.warnings.map((i) => i.message),
    };
  }

  revalidatePath(`/admin/proposals/${parsed.data.id}`, "layout");
  return {
    ...EMPTY,
    notice: "Tarifas de imagem salvas.",
    warnings: result.warnings.map((i) => i.message),
  };
}
