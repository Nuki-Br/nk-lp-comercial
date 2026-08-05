"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/server/auth/requireAdmin";
import { enabledDelta, saveProposalOverride } from "@/server/proposals/config";

/* Re-checks, like every other action. Proxy matchers skip Server Functions, so
   an action is reachable even when the page rendering its form is not. ADR 15. */

export type SlidesState = {
  error: string | null;
  notice: string | null;
  /** Blocking validation failures, one message per line the admin can act on. */
  issues: string[];
  warnings: string[];
};

/* The picker submits structured data, so it arrives as one JSON field rather
   than a dozen flat ones. Zod parses it — the same validator the rest of the
   write path uses, and the reason no new dependency shows up here. */
const slidesState = z.object({
  order: z.array(z.string().min(1)).min(1),
  enabled: z.record(z.string().min(1), z.boolean()),
});

export async function saveSlidesAction(
  _prev: SlidesState,
  formData: FormData,
): Promise<SlidesState> {
  const admin = await getAdmin();
  if (!admin) {
    return { error: "Sessão expirada. Entre novamente.", notice: null, issues: [], warnings: [] };
  }

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { error: "Proposta inválida.", notice: null, issues: [], warnings: [] };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("state") ?? ""));
  } catch {
    return {
      error: "Não foi possível ler as alterações. Recarregue a página e tente de novo.",
      notice: null,
      issues: [],
      warnings: [],
    };
  }

  const parsed = slidesState.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Não foi possível ler as alterações. Recarregue a página e tente de novo.",
      notice: null,
      issues: [],
      warnings: [],
    };
  }

  const { hidden, shown } = enabledDelta(new Map(Object.entries(parsed.data.enabled)));
  const result = await saveProposalOverride(id.data, {
    order: parsed.data.order,
    hidden,
    shown,
  });

  if (!result.ok) {
    /* Messages, not codes. The reader is a salesperson mid-preparation, and
       "validation failed" is the outcome this whole validator exists to avoid. */
    return {
      error: null,
      notice: null,
      issues: result.issues.map((i) => i.message),
      warnings: result.warnings.map((i) => i.message),
    };
  }

  revalidatePath(`/admin/proposals/${id.data}`, "layout");
  return {
    error: null,
    notice: "Slides salvos.",
    issues: [],
    warnings: result.warnings.map((i) => i.message),
  };
}
