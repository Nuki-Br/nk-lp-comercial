"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  type PricingState,
  saveImagePricesAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { Feedback } from "@/components/admin/PricingEditor";

/* The two image tariffs, per proposal.
 *
 * These are the numbers `Ctrl+Alt+K` edits live on /fast. That panel does not
 * exist on a client's link — `forVisitor` forces `allowPriceOverride` false at
 * publish and again at render — because on a URL that stays with the client, a
 * hidden panel exposing cost basis is a discoverable leak. This form is the
 * replacement, and it says so on screen. */

const EMPTY: PricingState = { error: null, notice: null, issues: [], warnings: [] };

const field =
  "rounded-xl border border-nuki-gray-border bg-nuki-white px-3 py-2 outline-none focus:border-nuki-green-02";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-nuki-gray-7";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar tarifas"}
    </button>
  );
}

export function ImagePricesForm({
  id,
  base,
  option,
}: {
  id: string;
  base: number;
  option: number;
}) {
  const [state, action] = useActionState<PricingState, FormData>(saveImagePricesAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap gap-3">
        <label className="flex w-48 flex-col gap-1">
          <span className={labelClass}>Imagem base (R$)</span>
          <input
            className={field}
            name="base"
            type="number"
            min={1}
            step={1}
            defaultValue={base}
            required
          />
        </label>
        <label className="flex w-48 flex-col gap-1">
          <span className={labelClass}>Imagem de opção (R$)</span>
          <input
            className={field}
            name="option"
            type="number"
            min={1}
            step={1}
            defaultValue={option}
            required
          />
        </label>
      </div>

      <p className="text-xs text-nuki-gray-7">
        A imagem base é o render 3D do ambiente; a de opção é o recorte de acabamento sobre ele, por
        isso mais barata. São as tarifas que a calculadora desta proposta usa. O painel escondido
        que edita esses valores durante a apresentação existe só no deck interno — no link do
        cliente ele não é acessível.
      </p>

      <Feedback state={state} />

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
