import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ComposerTabs } from "@/components/admin/ComposerTabs";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { buttonClass } from "@/components/admin/ui/Button";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { getProposal } from "@/server/proposals/admin";

/* The composer's shared frame: who the proposal is for, and the four tabs.
 *
 * `requireAdmin()` here is NOT the gate — every page below still calls it at its
 * own top, because layout-only gating is the hole ADR 15 names and a Server
 * Function is reachable without ever rendering its layout. This call exists so
 * the frame itself does not read a proposal for a signed-out visitor.
 *
 * A régua de abas subiu para cá. Enquanto cada página renderizava a sua, as
 * quatro remontavam a cada navegação — e o compositor é uma tela em que se
 * troca de aba dezenas de vezes por proposta. No layout ela é montada uma vez, e
 * a aba ativa sai do pathname.
 *
 * A faixa é grudenta abaixo da barra do painel (`top-14`) porque a aba Slides
 * ocupa a altura toda da janela: sem isso, o título da proposta e as abas
 * sairiam de vista assim que o rail rolasse. */

export const dynamic = "force-dynamic";

/** Mais larga que o resto do painel. A aba Slides é uma prévia ao lado de um
    rail, e uma prévia de deck espremida em 700px não mostra o que precisa. */
const CONTAINER = "max-w-7xl";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  published: { label: "Publicada", tone: "success" },
  archived: { label: "Arquivada", tone: "neutral" },
};

export default async function ProposalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();

  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const status = STATUS[proposal.status] ?? { label: proposal.status, tone: "neutral" as const };

  return (
    <>
      <AdminTopBar email={admin.email} role={admin.role} container={CONTAINER} />

      <div className="sticky top-14 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className={`mx-auto w-full px-4 sm:px-6 ${CONTAINER}`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 pb-3">
            <Link
              href="/admin"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
            >
              <span aria-hidden="true">←</span> Propostas
            </Link>
            <span aria-hidden="true" className="text-border select-none">
              /
            </span>

            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">
              {proposal.title}
            </h1>
            <Badge tone={status.tone}>{status.label}</Badge>
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {proposal.clients?.name}
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/* A mesma rota que a aba Slides mostra na moldura, em tamanho
                  real. É onde a demo do módulo e o teclado do deck funcionam de
                  verdade — dentro de um iframe de 700px, nenhum dos dois diz
                  nada. */}
              <a
                href={`/preview/${id}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("outline", "sm")}
              >
                Ver a prévia <span aria-hidden="true">↗</span>
                <span className="sr-only">em uma nova aba</span>
              </a>
            </div>
          </div>

          <ComposerTabs id={id} />
        </div>
      </div>

      <main className={`mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 ${CONTAINER}`}>
        {children}
      </main>
    </>
  );
}
