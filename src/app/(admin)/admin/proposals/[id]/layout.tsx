import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ComposerTabs } from "@/components/admin/ComposerTabs";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { buttonClass } from "@/components/admin/ui/Button";
import { ADMIN_COLUMN, PageShell } from "@/components/admin/ui/Page";
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
 * A faixa é grudenta abaixo da barra do painel (`--admin-bar`) porque a aba
 * Slides ocupa a altura toda da janela: sem isso, o título da proposta e as abas
 * sairiam de vista assim que o rail rolasse. A altura dela é `--admin-ruler`, e
 * as duas somadas são `--admin-sticky` — que é o que os painéis grudentos das
 * abas e o `scroll-mt` da `Section` leem. Nenhum `rem` solto: eram quatro, em
 * quatro arquivos. Ver `src/styles/admin.css`. */

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  published: { label: "Publicada", tone: "success" },
  unpublished: { label: "Despublicada", tone: "warning" },
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
      <AdminTopBar email={admin.email} role={admin.role} />

      <div className="sticky top-[var(--admin-bar)] z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className={ADMIN_COLUMN}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 pb-3">
            {/* A seta anda para a esquerda no hover. É a única dica de direção
                que um "voltar" tem, e ela custa uma classe. */}
            <Link
              href="/admin"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
            >
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5"
              >
                ←
              </span>{" "}
              <span className="group-hover:underline">Propostas</span>
            </Link>
            <span aria-hidden="true" className="text-border select-none">
              /
            </span>

            {/* O cliente vem antes do título, e com o mesmo peso — é o que a
                lista em `/admin` já faz (construtora é a primeira coluna).
                Uma proposta é "o deck da Construtora X", não "Proposta
                comercial Nuki #42"; o título interno é só o rótulo que
                distingue duas propostas do mesmo cliente. */}
            <span className="min-w-0 shrink-0 truncate text-base font-semibold tracking-tight">
              {proposal.clients?.name}
            </span>
            <span aria-hidden="true" className="text-border select-none">
              /
            </span>
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">
              {proposal.title}
            </h1>
            <Badge tone={status.tone}>{status.label}</Badge>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/* A mesma rota que a aba Slides mostra na moldura, em tamanho
                  real. É onde a demo do módulo e o teclado do deck funcionam de
                  verdade — dentro de um iframe de 700px, nenhum dos dois diz
                  nada. */}
              <a
                href={`/preview/${id}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("outline", "sm", "group")}
              >
                Ver a prévia
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                >
                  ↗
                </span>
                <span className="sr-only">em uma nova aba</span>
              </a>
            </div>
          </div>

          <ComposerTabs id={id} />
        </div>
      </div>

      <PageShell>{children}</PageShell>
    </>
  );
}
