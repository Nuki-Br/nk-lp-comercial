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

  /* Clamped with the shared range rather than a second copy of the numbers.
     docs/estimate.md: ESTIMATE_RANGES stays in code because it is what stops an
     admin typo becoming an absurd quote. */
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
