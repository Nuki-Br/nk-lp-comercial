"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type UnlockState, unlockProposalAction } from "@/app/(deck)/p/[slug]/actions";

/**
 * The proposal gate.
 *
 * Reuses `AccessGate`'s `.gate*` markup and CSS on purpose — the two surfaces
 * should look like one product — and shares NONE of its logic. `AccessGate`
 * compares a password inlined in the client bundle, which is the right pattern
 * for `/fast` (it must work with Supabase down, ADR 9) and exactly the wrong one
 * here.
 *
 * Nothing in this component knows the password, the proposal id, or anything
 * about the deck behind it. It posts a string to a server action and re-renders
 * whatever the server decides.
 */

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="gate-submit" disabled={pending}>
      {pending ? "Verificando…" : "Entrar"}
    </button>
  );
}

export function ProposalGate({ slug }: { slug: string }) {
  const [state, action] = useActionState<UnlockState, FormData>(unlockProposalAction, {
    error: null,
  });

  return (
    <div className="gate">
      <form className="gate-card" action={action}>
        <input type="hidden" name="slug" value={slug} />

        <span className="gate-tag">Acesso restrito</span>
        <h1 className="gate-title">Proposta Nuki</h1>
        <p className="gate-lead">
          Esta proposta é exclusiva para o seu time. Informe a senha que enviamos junto com o link.
        </p>

        <label className="gate-label" htmlFor="proposal-gate-input">
          Senha
        </label>
        <input
          id="proposal-gate-input"
          name="password"
          className={`gate-input${state.error ? " has-error" : ""}`}
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        {state.error && (
          <p className="gate-error" role="alert">
            {state.error}
          </p>
        )}

        <Submit />
      </form>
    </div>
  );
}
