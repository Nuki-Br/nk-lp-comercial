"use client";

import { useActionState } from "react";
import {
  type PricingState,
  saveImagePricesAction,
} from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { Feedback } from "@/components/admin/PricingEditor";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/admin/ui/Card";
import { FieldLabel, Input } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

/* The two image tariffs, per proposal.
 *
 * These are the numbers `Ctrl+Alt+K` edits live on /fast. That panel does not
 * exist on a client's link — `forVisitor` forces `allowPriceOverride` false at
 * publish and again at render — because on a URL that stays with the client, a
 * hidden panel exposing cost basis is a discoverable leak. This form is the
 * replacement, and it says so on screen. */

const EMPTY: PricingState = { error: null, notice: null, issues: [], warnings: [] };

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

  /* O card é deste componente e não da página: na aba de preços ele é um slot
     dentro do editor, que é quem monta as duas colunas. */
  return (
    <Card>
      <CardHeader
        title="Tarifas de imagem"
        description="A base de custo por trás da calculadora desta proposta."
      />
      <form action={action}>
        <input type="hidden" name="id" value={id} />

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <FieldLabel label="Imagem base (R$)" className="w-48">
              <Input name="base" type="number" min={1} step={1} defaultValue={base} required />
            </FieldLabel>
            <FieldLabel label="Imagem de opção (R$)" className="w-48">
              <Input name="option" type="number" min={1} step={1} defaultValue={option} required />
            </FieldLabel>
          </div>

          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            A imagem base é o render 3D do ambiente; a de opção é o recorte de acabamento sobre ele,
            por isso mais barata. São as tarifas que a calculadora desta proposta usa. O painel
            escondido que edita esses valores durante a apresentação existe só no deck interno — no
            link do cliente ele não é acessível.
          </p>

          <Feedback state={state} />
        </CardContent>

        <CardFooter hint="A calculadora recalcula com estes valores assim que você salvar.">
          <SubmitButton label="Salvar tarifas" pendingLabel="Salvando…" />
        </CardFooter>
      </form>
    </Card>
  );
}
