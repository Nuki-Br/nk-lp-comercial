"use client";

import { useActionState } from "react";
import {
  type DetailState,
  setPasswordAction,
  updateProposalAction,
} from "@/app/(admin)/admin/proposals/[id]/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Field, Input } from "@/components/admin/ui/Field";
import { SectionActions } from "@/components/admin/ui/Section";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

/* Os dois formulários de ajuste da Visão geral. O terceiro — publicar — mora em
   `PublishPanel.tsx`, junto do link e da lista de conferência, porque é a mesma
   pergunta e não a mesma tela. */

const EMPTY: DetailState = { error: null, notice: null, warnings: [] };

/* Warnings render ALONGSIDE the outcome, never instead of it: the action either
   succeeded or it did not, and "salvo" plus "confira isto antes de mandar" are
   two facts a salesperson needs at the same time. */
export function Feedback({ state }: { state: DetailState }) {
  if (!state.error && !state.notice && state.warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
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

export function DetailsForm({
  id,
  title,
  expiresAt,
}: {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, already trimmed from the stored timestamp. */
  expiresAt: string;
}) {
  const [state, action] = useActionState<DetailState, FormData>(updateProposalAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <Field label="Título" htmlFor="title">
          <Input id="title" name="title" defaultValue={title} required />
        </Field>

        <Field label="Expira em" htmlFor="expiresAt">
          <Input id="expiresAt" name="expiresAt" type="date" defaultValue={expiresAt} />
        </Field>
      </div>

      <Feedback state={state} />

      <SectionActions hint="Em branco, a proposta não expira. Depois da data, o cliente vê um aviso mesmo com a senha correta.">
        <SubmitButton label="Salvar" pendingLabel="Salvando…" />
      </SectionActions>
    </form>
  );
}

export function PasswordForm({ id, hasPassword }: { id: string; hasPassword: boolean }) {
  const [state, action] = useActionState<DetailState, FormData>(setPasswordAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <Field
        label={hasPassword ? "Trocar a senha" : "Definir a senha"}
        htmlFor="password"
        className="sm:max-w-sm"
      >
        <Input
          id="password"
          name="password"
          type="text"
          minLength={6}
          maxLength={64}
          required
          autoComplete="off"
          className="font-mono"
          placeholder="6 a 64 caracteres"
        />
      </Field>

      {!hasPassword && (
        <Alert tone="warning">Sem senha definida, ninguém consegue abrir o link.</Alert>
      )}

      <Feedback state={state} />

      <SectionActions hint="Trocar a senha revoga a anterior. Quem já estava com a proposta aberta continua dentro até o cookie vencer.">
        <SubmitButton label="Salvar senha" pendingLabel="Salvando…" />
      </SectionActions>
    </form>
  );
}
