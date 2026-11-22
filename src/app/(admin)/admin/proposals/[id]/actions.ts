"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/server/auth/requireAdmin";
import {
  deleteProposal,
  publishProposal,
  setProposalPassword,
  unpublishProposal,
  updateProposal,
} from "@/server/proposals/admin";
import { markProposalAttentionInternal } from "@/server/tracking/reset";

/* Every action re-checks. Not the layout, not the page it was rendered from —
   Proxy matchers skip Server Functions, so an action is reachable even when the
   page that renders its form is not. ADR 15. */

/** `warnings` are the validator's non-blocking channel: the save (or the
    publish) went through, and there is still something the salesperson should
    look at before sending the link. Rendered separately from `notice`, because
    "salvo" and "salvo, mas ainda há algo a conferir" are not the same message. */
export type DetailState = {
  error: string | null;
  notice: string | null;
  warnings: string[];
};

const uuid = z.string().uuid();

const details = z.object({
  id: uuid,
  title: z.string().trim().min(2).max(120),
  /* An empty date input means "no expiry", which is NOT the same as expired —
     the column is nullable and the DAL treats null as open-ended. */
  expiresAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
});

export async function updateProposalAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = details.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    expiresAt: formData.get("expiresAt") ?? "",
  });

  if (!parsed.success)
    return { error: "Confira o título e a data de expiração.", notice: null, warnings: [] };

  /* End of day in the browser's terms is not a thing the server can know, so
     expiry lands at the end of the chosen day in UTC. A proposal that expires
     "on the 10th" stays open through the 10th everywhere in Brazil. */
  const expiresAt = parsed.data.expiresAt
    ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`).toISOString()
    : null;

  await updateProposal(parsed.data.id, { title: parsed.data.title, expiresAt });

  revalidatePath(`/admin/proposals/${parsed.data.id}`);
  revalidatePath("/admin");
  return { error: null, notice: "Alterações salvas.", warnings: [] };
}

const password = z.object({
  id: uuid,
  /* Short enough to read over the phone, long enough that the rate limit has
     something to protect. docs/security.md carries the reasoning. */
  password: z.string().min(6).max(64),
});

export async function setPasswordAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = password.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });

  if (!parsed.success)
    return { error: "A senha precisa ter de 6 a 64 caracteres.", notice: null, warnings: [] };

  await setProposalPassword(parsed.data.id, parsed.data.password, admin.id);

  revalidatePath(`/admin/proposals/${parsed.data.id}`);
  revalidatePath("/admin");
  return {
    error: null,
    notice: "Senha definida. Anote-a agora — ela ainda não pode ser lida de volta.",
    warnings: [],
  };
}

export async function publishProposalAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Proposta inválida.", notice: null, warnings: [] };

  const result = await publishProposal(parsed.data);
  if (!result.ok) {
    return { error: result.issues.join(" "), notice: null, warnings: result.warnings };
  }

  revalidatePath(`/admin/proposals/${parsed.data}`);
  revalidatePath("/admin");
  return {
    error: null,
    notice: "Proposta publicada. O link já abre para o cliente.",
    warnings: result.warnings,
  };
}

export async function unpublishProposalAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Proposta inválida.", notice: null, warnings: [] };

  await unpublishProposal(parsed.data);

  revalidatePath(`/admin/proposals/${parsed.data}`);
  revalidatePath("/admin");
  return {
    error: null,
    notice:
      "Proposta despublicada. O cliente vê um aviso de indisponível até você publicar de novo.",
    warnings: [],
  };
}

/**
 * Zera a contagem depois de um teste — o passo entre "publiquei para conferir"
 * e "mandei para o cliente".
 *
 * Não apaga: marca as sessões como internas, que é como uma abertura da equipe
 * já era excluída de toda leitura. `src/server/tracking/reset.ts` explica por
 * quê, e a ADR 25 é o registro.
 */
export async function resetAttentionAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Proposta inválida.", notice: null, warnings: [] };

  const marked = await markProposalAttentionInternal(parsed.data);

  revalidatePath(`/admin/proposals/${parsed.data}`);
  /* A lista e o painel inicial contam aberturas pelo mesmo filtro, então os dois
     mudam com este clique. */
  revalidatePath("/admin");

  if (marked === 0) {
    return { error: null, notice: "Não havia aberturas para zerar.", warnings: [] };
  }

  return {
    error: null,
    notice:
      marked === 1
        ? "Estatísticas zeradas — 1 abertura anterior agora conta como teste interno."
        : `Estatísticas zeradas — ${marked} aberturas anteriores agora contam como teste interno.`,
    warnings: [],
  };
}

export async function deleteProposalAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente.", notice: null, warnings: [] };

  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Proposta inválida.", notice: null, warnings: [] };

  await deleteProposal(parsed.data);

  revalidatePath(`/admin/proposals/${parsed.data}`);
  revalidatePath("/admin");
  redirect("/admin");
}
