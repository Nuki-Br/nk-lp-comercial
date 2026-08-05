"use client";

import { useActionState, useState } from "react";
import {
  type DetailState,
  publishProposalAction,
} from "@/app/(admin)/admin/proposals/[id]/actions";
import { Feedback } from "@/components/admin/ProposalDetailForms";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { Card } from "@/components/admin/ui/Card";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import { cn } from "@/lib/cn";

/* O envio, inteiro, num painel só.
 *
 * Antes eram três blocos separados por uma tela de rolagem: o link no topo, os
 * avisos de "isto ainda não abre" junto dele, e o botão que resolve lá embaixo —
 * de forma que o aviso tinha de dizer "publique na seção abaixo" porque a seção
 * abaixo não estava à vista. As três coisas respondem à mesma pergunta ("dá pra
 * mandar isto agora?"), então agora são uma, grudenta ao lado do resto.
 *
 * A lista de conferência é o que substitui os avisos soltos: ela mostra os três
 * fatos SEMPRE — senha, publicação, validade — e não só quando um deles está
 * errado. Um vendedor prestes a mandar um link para um cliente quer ver os três
 * verdes, e uma ausência de aviso não é a mesma coisa que uma confirmação. */

/** O que impede — ou não — o link de abrir agora. */
export type SendState = "draft" | "no-password" | "expired" | "stale" | "live";

/* O estado do envio é uma PÍLULA, como em qualquer construtor de site: uma
   palavra que se lê de relance no mesmo lugar, sempre. A frase ao lado é o mesmo
   fato por extenso — a cor da pílula nunca o carrega sozinha — e a faixa de
   fundo é só o eco dela, para o painel inteiro ter a cor do estado.
 *
 * `draft` e `no-password` eram um estado só ("bloqueada"), e uma pílula obriga a
 * separá-los: são as duas maneiras de o link não abrir, e a que se resolve não é
 * a mesma. */
const STATE: Record<SendState, { badge: string; tone: BadgeTone; detail: string; band: string }> = {
  draft: {
    badge: "Rascunho",
    tone: "neutral",
    detail: "O cliente vê “não encontrado” até você publicar.",
    band: "bg-muted/40",
  },
  "no-password": {
    badge: "Sem senha",
    tone: "warning",
    detail: "Publicada, mas ninguém consegue entrar sem uma senha definida.",
    band: "bg-warning/8",
  },
  expired: {
    badge: "Expirada",
    tone: "danger",
    detail: "Passou da data de validade: o cliente vê o aviso mesmo com a senha certa.",
    band: "bg-destructive/8",
  },
  stale: {
    badge: "Alterações pendentes",
    tone: "warning",
    detail: "O cliente continua vendo a versão publicada até você publicar de novo.",
    band: "bg-warning/8",
  },
  live: {
    badge: "No ar",
    tone: "success",
    detail: "O link abre com a senha desta proposta.",
    band: "bg-success/8",
  },
};

/** O rótulo do botão diz a AÇÃO, não o estado — o estado está na pílula acima. */
const publishLabel = (sendState: SendState): string => {
  if (sendState === "draft") return "Publicar";
  if (sendState === "stale") return "Publicar alterações";
  return "Publicar de novo";
};

export type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  /** Âncora para a seção que resolve o item, quando ela existe nesta página. */
  href?: string;
  hrefLabel?: string;
};

export function PublishPanel({
  id,
  url,
  sendState,
  checklist,
}: {
  id: string;
  /** A URL completa. É ela que vai para a área de transferência. */
  url: string;
  sendState: SendState;
  checklist: ChecklistItem[];
}) {
  const state = STATE[sendState];

  return (
    <Card className="overflow-hidden">
      <div className={cn("border-b border-border px-5 py-4", state.band)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Envio</h2>
          <Badge tone={state.tone}>{state.badge}</Badge>
        </div>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {state.detail}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        <LinkRow url={url} />

        <ul className="flex flex-col gap-2.5">
          {checklist.map((item) => (
            <ChecklistRow key={item.key} item={item} />
          ))}
        </ul>
      </div>

      <PublishForm id={id} sendState={sendState} />
    </Card>
  );
}

/** O link do cliente e o botão que o copia.
 *
 * O `https://` sai da vista porque numa coluna de 20rem ele custa um terço da
 * linha e não diz nada — o endereço completo continua no `title` e é ele, não o
 * encurtado, que vai para a área de transferência. */
function LinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code
        title={url}
        className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground"
      >
        {url.replace(/^https?:\/\//, "")}
      </code>
      <Button
        variant="outline"
        size="sm"
        /* Nome fixo, rótulo variável: o `aria-label` mantém o botão chamando-se
           a mesma coisa quando o texto vira "Copiado", e é a região viva abaixo
           que anuncia a troca. Sem ele, o nome do botão mudaria debaixo de quem
           está com o foco nele. */
        aria-label="Copiar o link do cliente"
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
        {/* `aria-live` no rótulo, e não no botão: o que muda é o texto, e um
            leitor de tela precisa ouvir "copiado" sem precisar reler o botão. */}
        <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-px flex size-4 shrink-0 items-center justify-center rounded-full border",
          item.done
            ? "border-success/30 bg-success/12 text-success"
            : "border-dashed border-warning/60 text-warning",
        )}
      >
        {item.done ? (
          <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-2.5">
            <path
              d="M2.5 6.25 4.75 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        {/* O ícone é forma; o fato precisa existir em texto para quem não o vê. */}
        <span className="sr-only">{item.done ? "Feito:" : "Pendente:"}</span>
      </span>

      <span className="min-w-0 text-[0.8125rem] leading-relaxed">
        <span className="font-medium text-foreground">{item.label}</span>{" "}
        <span className="text-muted-foreground">{item.detail}</span>{" "}
        {item.href && (
          <a
            href={item.href}
            className="font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            {item.hrefLabel}
          </a>
        )}
      </span>
    </li>
  );
}

const EMPTY: DetailState = { error: null, notice: null, warnings: [] };

/* O botão diz "Publicar", e o congelamento é dito na linha abaixo dele.
 *
 * "Congelar e publicar" carregava a garantia da ADR 13 no próprio rótulo — uma
 * proposta enviada não muda porque alguém editou um padrão dois meses depois.
 * A garantia continua valendo e continua escrita; o que mudou é onde. Um botão
 * de publicar chamado "Congelar e publicar" faz o vendedor parar para decidir se
 * é isso mesmo que ele quer, toda vez, e a resposta é sempre sim. */
function PublishForm({ id, sendState }: { id: string; sendState: SendState }) {
  const [state, action] = useActionState<DetailState, FormData>(publishProposalAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-border px-5 py-4">
      <input type="hidden" name="id" value={id} />

      <Feedback state={state} />

      <SubmitButton className="w-full" label={publishLabel(sendState)} pendingLabel="Publicando…" />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {sendState === "draft"
          ? "Publicar tira uma fotografia do deck de hoje. A partir daí, editar preços ou textos padrão não muda o que o cliente recebeu."
          : "Publicar de novo substitui a fotografia que o cliente vê pelo estado de agora."}
      </p>
    </form>
  );
}
