"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/server/auth/requireAdmin";
import { createProposalFromDefaults } from "@/server/proposals/admin";

/* requireAdmin() at the top of EVERY action, not only in the layout.
   Next's guide is explicit that Proxy matchers skip Server Functions, so a
   matcher edit can remove coverage from this file with no error at all —
   ADR 15. `getAdmin()` rather than `requireAdmin()` because an action should
   fail, not navigate. */

const newProposal = z.object({
  clientName: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(120),
});

export type CreateState = { error: string | null };

export async function createProposalAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sessão expirada. Entre novamente." };

  const parsed = newProposal.safeParse({
    clientName: formData.get("clientName"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { error: "Informe o nome da construtora e um título para a proposta." };
  }

  const { id } = await createProposalFromDefaults({
    clientName: parsed.data.clientName,
    title: parsed.data.title,
    createdBy: admin.id,
  });

  revalidatePath("/admin");
  redirect(`/admin/proposals/${id}`);
}
