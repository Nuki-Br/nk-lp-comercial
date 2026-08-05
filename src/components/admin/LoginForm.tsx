"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type LoginState, signInAction } from "@/app/(admin)/admin/login/actions";

/* Plain Tailwind on the --color-nuki-* tokens. No component library: Rule 3
   bans them, and this is four inputs. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-nuki-green-03 px-6 py-3 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signInAction, { error: null });

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="text-sm font-semibold text-nuki-gray-mid" htmlFor="admin-email">
        E-mail
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        className="rounded-xl border border-nuki-gray-border bg-nuki-white px-4 py-3 outline-none focus:border-nuki-green-02"
      />

      <label className="text-sm font-semibold text-nuki-gray-mid" htmlFor="admin-password">
        Senha
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="rounded-xl border border-nuki-gray-border bg-nuki-white px-4 py-3 outline-none focus:border-nuki-green-02"
      />

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-nuki-orange">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
