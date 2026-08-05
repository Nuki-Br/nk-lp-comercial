"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type DetailState,
  publishProposalAction,
  setPasswordAction,
  updateProposalAction,
} from "@/app/(admin)/admin/proposals/[id]/actions";

const EMPTY: DetailState = { error: null, notice: null };

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: DetailState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-semibold text-nuki-orange">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return <p className="text-sm font-semibold text-nuki-green-02">{state.notice}</p>;
  }
  return null;
}

const field =
  "rounded-xl border border-nuki-gray-border bg-nuki-white px-4 py-3 outline-none focus:border-nuki-green-02";
const label = "text-sm font-semibold text-nuki-gray-mid";

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
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <label className={label} htmlFor="title">
        Título
      </label>
      <input id="title" name="title" defaultValue={title} required className={field} />

      <label className={label} htmlFor="expiresAt">
        Expira em
      </label>
      <input
        id="expiresAt"
        name="expiresAt"
        type="date"
        defaultValue={expiresAt}
        className={field}
      />
      <p className="text-xs text-nuki-gray-7">
        Em branco, a proposta não expira. Depois da data, o cliente vê um aviso mesmo com a senha
        correta.
      </p>

      <Feedback state={state} />
      <div className="flex justify-end">
        <Submit label="Salvar" pendingLabel="Salvando…" />
      </div>
    </form>
  );
}

export function PasswordForm({ id, hasPassword }: { id: string; hasPassword: boolean }) {
  const [state, action] = useActionState<DetailState, FormData>(setPasswordAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <label className={label} htmlFor="password">
        {hasPassword ? "Trocar a senha" : "Definir a senha"}
      </label>
      <input
        id="password"
        name="password"
        type="text"
        minLength={6}
        maxLength={64}
        required
        autoComplete="off"
        className={field}
        placeholder="6 a 64 caracteres"
      />
      <p className="text-xs text-nuki-gray-7">
        Trocar a senha revoga a anterior. Quem já estava com a proposta aberta continua dentro até o
        cookie vencer.
      </p>

      <Feedback state={state} />
      <div className="flex justify-end">
        <Submit label="Salvar senha" pendingLabel="Salvando…" />
      </div>
    </form>
  );
}

export function PublishForm({ id, published }: { id: string; published: boolean }) {
  const [state, action] = useActionState<DetailState, FormData>(publishProposalAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-nuki-gray-mid">
        {published
          ? "Publicada. Republicar congela um novo retrato do deck atual."
          : "Publicar congela o deck de hoje nesta proposta. Depois disso, mudar o conteúdo padrão não altera o que o cliente vê."}
      </p>
      <Feedback state={state} />
      <div className="flex justify-end">
        <Submit label={published ? "Republicar" : "Publicar"} pendingLabel="Publicando…" />
      </div>
    </form>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-lg bg-nuki-gray-light px-3 py-2 text-sm break-all">{url}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
            () => setCopied(false),
          );
        }}
        className="rounded-full border border-nuki-gray-border px-4 py-2 text-sm font-semibold transition hover:border-nuki-green-02"
      >
        {copied ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
