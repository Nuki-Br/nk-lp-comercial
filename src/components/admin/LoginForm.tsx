"use client";

import { useActionState } from "react";
import { type LoginState, signInAction } from "@/app/(admin)/admin/login/actions";
import { Alert } from "@/components/admin/ui/Alert";
import { Field, Input } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

/* Os primitivos de `src/components/admin/ui/`, escritos aqui no repo. Nenhuma
   biblioteca de componentes: a Regra 3 as proíbe, e isto são dois campos. */

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signInAction, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="E-mail" htmlFor="admin-email">
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="voce@nukibr.com"
          required
        />
      </Field>

      <Field label="Senha" htmlFor="admin-password">
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}

      <SubmitButton label="Entrar" pendingLabel="Entrando…" className="mt-1 w-full" />
    </form>
  );
}
