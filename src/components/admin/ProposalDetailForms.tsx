"use client";

import { useActionState, useRef } from "react";
import {
  type DetailState,
  deleteProposalAction,
  resetAttentionAction,
  setPasswordAction,
  updateProposalAction,
} from "@/app/(admin)/admin/proposals/[id]/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Button } from "@/components/admin/ui/Button";
import { Field, Input } from "@/components/admin/ui/Field";
import { SectionActions } from "@/components/admin/ui/Section";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

/* Os formulários de ajuste da Visão geral. O de publicar (e despublicar) mora em
   `PublishPanel.tsx`, junto do link e da lista de conferência, porque é a mesma
   pergunta e não a mesma tela. Excluir é o último aqui porque é o único que essa
   tela não volta a mostrar depois — o `<dialog>` existe para que um clique não
   baste.

   `ResetAttentionForm` é o intruso: ele é renderizado dentro de "Atenção do
   cliente", e não entre os ajustes. Mora aqui porque o que ele precisa é do
   mesmo `useActionState` sobre o mesmo `DetailState` — e porque a alternativa
   era um arquivo de cliente novo para um botão. */

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

const EMPTY_RESET: DetailState = { error: null, notice: null, warnings: [] };

/**
 * Zerar as estatísticas depois de um ensaio, na seção "Atenção do cliente".
 *
 * O diálogo NÃO se fecha sozinho no sucesso, e isso é o contrário do que se
 * esperaria. A página só mostra este bloco quando existe abertura para zerar,
 * então no instante em que a action termina a seção atrás do diálogo se
 * redesenha sem ele — e o aviso de "pronto" desmontaria junto, deixando o
 * clique sem resposta nenhuma. Ficando aberto, o diálogo é o único lugar da
 * tela que sobrevive à revalidação para dizer quantas aberturas saíram da
 * conta.
 */
export function ResetAttentionForm({
  id,
  title,
  sessionCount,
}: {
  id: string;
  title: string;
  /** Só para a confirmação dizer quanto está prestes a sair da conta. */
  sessionCount: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<DetailState, FormData>(resetAttentionAction, EMPTY_RESET);
  const done = Boolean(state.notice);

  const opens = sessionCount === 1 ? "1 abertura" : `${sessionCount} aberturas`;

  return (
    <>
      {/* Sem o tom "danger" do bloco de excluir, de propósito: nada aqui é
          apagado, e pintar os dois de vermelho ensinaria que a diferença entre
          eles é de grau. */}
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3.5 transition-colors duration-200 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
          Testou a proposta antes de mandar? Zere a contagem para o cliente começar do zero.
        </p>
        <Button variant="outline" className="shrink-0" onClick={() => dialog.current?.showModal()}>
          Zerar estatísticas
        </Button>
      </div>

      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="flex flex-col">
          <input type="hidden" name="id" value={id} />

          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">
              Zerar as estatísticas de “{title}”?
            </h2>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">
              {opens} passam a contar como teste interno: somem desta tela, da lista e do painel
              inicial, e a proposta volta a ler como nunca aberta. Nada é apagado — as sessões
              continuam guardadas, marcadas como internas —, e não há como desfazer por aqui.
            </p>
          </div>

          {(state.error || state.notice) && (
            <div className="px-5 py-4">
              <Alert tone={state.error ? "danger" : "success"} live>
                {state.error ?? state.notice}
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-muted/50 px-5 py-3">
            {done ? (
              <Button onClick={() => dialog.current?.close()}>Fechar</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => dialog.current?.close()}>
                  Cancelar
                </Button>
                <SubmitButton label="Zerar" pendingLabel="Zerando…" />
              </>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}

const EMPTY_DELETE: DetailState = { error: null, notice: null, warnings: [] };

/** Native `<dialog>`, como em `CreateProposalDialog` — o foco preso e o ESC já
    vêm de graça, e Rule 3 bane o modal de biblioteca de qualquer forma. Aqui o
    diálogo carrega mais peso que ali: confirmar não cria, apaga o caminho de
    volta desta tela até alguém publicar de novo. */
export function DeleteProposalForm({ id, title }: { id: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<DetailState, FormData>(deleteProposalAction, EMPTY_DELETE);

  return (
    <>
      {/* A mesma dupla borda/fundo do tom "danger" de `Alert` — não uma nova
          receita de cor. Sem ela, este botão era um `Button` nu ao lado de um
          parágrafo, exatamente como "Dados" e "Senha" ao lado dele: a única
          pista de que isto é diferente era a cor do próprio botão, tarde
          demais para quem só está passando o olho pela tela. */}
      <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3.5 transition-colors duration-200 hover:bg-destructive/12 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
          O link para de abrir e a proposta some desta lista. O histórico de aberturas continua
          guardado.
        </p>
        <Button
          variant="destructive"
          className="shrink-0"
          onClick={() => dialog.current?.showModal()}
        >
          Excluir proposta
        </Button>
      </div>

      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="flex flex-col">
          <input type="hidden" name="id" value={id} />

          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">Excluir “{title}”?</h2>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">
              O link para de abrir para o cliente e a proposta some desta lista. O histórico de
              aberturas fica guardado — nada é apagado de verdade, e não há como desfazer por aqui.
            </p>
          </div>

          {state.error && (
            <div className="px-5 py-4">
              <Alert tone="danger" live>
                {state.error}
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-muted/50 px-5 py-3">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Cancelar
            </Button>
            <SubmitButton variant="destructive" label="Excluir" pendingLabel="Excluindo…" />
          </div>
        </form>
      </dialog>
    </>
  );
}
