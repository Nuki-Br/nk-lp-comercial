"use client";

import { useActionState, useState } from "react";
import {
  type DetailState,
  publishProposalAction,
  setPasswordAction,
  updateProposalAction,
} from "@/app/(admin)/admin/proposals/[id]/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Button } from "@/components/admin/ui/Button";
import { CardContent, CardFooter } from "@/components/admin/ui/Card";
import { Field, Input } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";

const EMPTY: DetailState = { error: null, notice: null, warnings: [] };

/* Warnings render ALONGSIDE the outcome, never instead of it: the action either
   succeeded or it did not, and "salvo" plus "confira isto antes de mandar" are
   two facts a salesperson needs at the same time. */
function Feedback({ state }: { state: DetailState }) {
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
    <form action={action}>
      <input type="hidden" name="id" value={id} />

      <CardContent className="flex flex-col gap-4">
        <Field label="Título" htmlFor="title">
          <Input id="title" name="title" defaultValue={title} required />
        </Field>

        <Field
          label="Expira em"
          htmlFor="expiresAt"
          hint="Em branco, a proposta não expira. Depois da data, o cliente vê um aviso mesmo com a senha correta."
        >
          <Input
            id="expiresAt"
            name="expiresAt"
            type="date"
            defaultValue={expiresAt}
            className="w-full sm:w-56"
          />
        </Field>

        <Feedback state={state} />
      </CardContent>

      <CardFooter>
        <SubmitButton label="Salvar" pendingLabel="Salvando…" />
      </CardFooter>
    </form>
  );
}

export function PasswordForm({ id, hasPassword }: { id: string; hasPassword: boolean }) {
  const [state, action] = useActionState<DetailState, FormData>(setPasswordAction, EMPTY);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />

      <CardContent className="flex flex-col gap-4">
        <Field
          label={hasPassword ? "Trocar a senha" : "Definir a senha"}
          htmlFor="password"
          hint="Trocar a senha revoga a anterior. Quem já estava com a proposta aberta continua dentro até o cookie vencer."
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
      </CardContent>

      <CardFooter>
        <SubmitButton label="Salvar senha" pendingLabel="Salvando…" />
      </CardFooter>
    </form>
  );
}

/* Publishing is a freeze, and the button has to say so. ADR 13's guarantee — a
   sent proposal does not change because someone edited a default two months
   later — is only worth anything if the salesperson knows which version the
   client is looking at. Hence "Congelar e publicar", and hence the stale
   banner: an edit made after publishing is invisible to the client until it is
   republished, and that is the fact most likely to be assumed the other way. */
export function PublishForm({
  id,
  published,
  snapshotStale,
  publishedAt,
}: {
  id: string;
  published: boolean;
  /** Published, and the stored delta no longer matches the frozen snapshot. */
  snapshotStale: boolean;
  publishedAt: string | null;
}) {
  const [state, action] = useActionState<DetailState, FormData>(publishProposalAction, EMPTY);

  const frozenOn = publishedAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(publishedAt),
      )
    : null;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />

      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {published
            ? `Congelada${frozenOn ? ` em ${frozenOn}` : ""}. O cliente vê esse retrato, e só ele — mudar o conteúdo padrão do deck não altera esta proposta.`
            : "Publicar congela o deck de hoje nesta proposta. A partir daí ela vira um documento comercial fixo: editar preços ou textos padrão não muda o que o cliente já recebeu."}
        </p>

        {snapshotStale && (
          <Alert tone="warning" title="Alterações depois da publicação">
            O cliente continua vendo a versão congelada até você republicar.
          </Alert>
        )}

        <Feedback state={state} />
      </CardContent>

      <CardFooter hint={published ? "Republicar substitui o retrato congelado." : undefined}>
        <SubmitButton
          label={published ? "Republicar (congela de novo)" : "Congelar e publicar"}
          pendingLabel="Publicando…"
        />
      </CardFooter>
    </form>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-[0.8125rem] break-all">
        {url}
      </code>
      <Button
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(url).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
            () => setCopied(false),
          );
        }}
      >
        {copied ? "Copiado" : "Copiar link"}
      </Button>
    </div>
  );
}
