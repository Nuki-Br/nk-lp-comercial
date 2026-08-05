"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { type CreateState, createProposalAction } from "@/app/(admin)/admin/actions";

/* Native <dialog>. Focus trapping, ESC-to-close and ::backdrop come free, which
   is most of what a modal library is sold for — and Rule 3 bans the library. */

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar proposta"}
    </button>
  );
}

export function CreateProposalDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<CreateState, FormData>(createProposalAction, {
    error: null,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08"
      >
        Nova proposta
      </button>

      <dialog
        ref={dialog}
        className="m-auto w-full max-w-md rounded-2xl p-0 backdrop:bg-nuki-black/40"
      >
        <form action={formAction} className="flex flex-col gap-3 p-6">
          <h2 className="text-lg font-bold text-nuki-green-03">Nova proposta</h2>
          <p className="text-sm text-nuki-gray-mid">
            Começa a partir do deck padrão. A personalização é feita depois.
          </p>

          <label className="mt-2 text-sm font-semibold text-nuki-gray-mid" htmlFor="clientName">
            Construtora
          </label>
          <input
            id="clientName"
            name="clientName"
            required
            minLength={2}
            maxLength={80}
            className="rounded-xl border border-nuki-gray-border px-4 py-3 outline-none focus:border-nuki-green-02"
          />

          <label className="text-sm font-semibold text-nuki-gray-mid" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            name="title"
            required
            minLength={2}
            maxLength={120}
            defaultValue="Proposta comercial Nuki"
            className="rounded-xl border border-nuki-gray-border px-4 py-3 outline-none focus:border-nuki-green-02"
          />

          {state.error && (
            <p role="alert" className="text-sm font-semibold text-nuki-orange">
              {state.error}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-full px-5 py-2.5 font-semibold text-nuki-gray-mid hover:text-nuki-black"
            >
              Cancelar
            </button>
            <Submit />
          </div>
        </form>
      </dialog>
    </>
  );
}
