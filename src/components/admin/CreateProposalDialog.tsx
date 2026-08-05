"use client";

import { useActionState, useRef } from "react";
import { type CreateState, createProposalAction } from "@/app/(admin)/admin/actions";
import { Alert } from "@/components/admin/ui/Alert";
import { Button } from "@/components/admin/ui/Button";
import { Field, Input } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

/* Native <dialog>. Focus trapping, ESC-to-close and ::backdrop come free, which
   is most of what a modal library is sold for — and Rule 3 bans the library.

   O visual moderno é `backdrop:backdrop-blur-sm` e as animações de
   `open`/`starting-style` no CSS — nada disso precisa de JS, e nenhum deles
   custa o foco preso que o `<dialog>` já entrega. */

export function CreateProposalDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<CreateState, FormData>(createProposalAction, {
    error: null,
  });

  return (
    <>
      <Button onClick={() => dialog.current?.showModal()}>Nova proposta</Button>

      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={formAction} className="flex flex-col">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">Nova proposta</h2>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">
              Começa a partir do deck padrão. A personalização é feita depois.
            </p>
          </div>

          <div className="flex flex-col gap-4 px-5 py-5">
            <Field label="Construtora" htmlFor="clientName">
              <Input
                id="clientName"
                name="clientName"
                required
                minLength={2}
                maxLength={80}
                placeholder="Construtora Exemplo"
              />
            </Field>

            <Field label="Título" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                minLength={2}
                maxLength={120}
                defaultValue="Proposta comercial Nuki"
              />
            </Field>

            {state.error && (
              <Alert tone="danger" live>
                {state.error}
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-muted/50 px-5 py-3">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Cancelar
            </Button>
            <SubmitButton label="Criar proposta" pendingLabel="Criando…" />
          </div>
        </form>
      </dialog>
    </>
  );
}
