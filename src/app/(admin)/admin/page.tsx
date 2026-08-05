import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CreateProposalDialog } from "@/components/admin/CreateProposalDialog";
import { PortfolioOverview } from "@/components/admin/PortfolioOverview";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Card, PageHeader } from "@/components/admin/ui/Card";
import { buildDefaultDeck } from "@/deck/defaults";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { listProposals } from "@/server/proposals/admin";
import { portfolioAttention } from "@/server/tracking/readout";

/* Session-bound and never cacheable. */
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  published: { label: "Publicada", tone: "success" },
  archived: { label: "Arquivada", tone: "neutral" },
};

/* A date, in pt-BR, from Intl — no date library (Rule 3). */
const formatDate = (iso: string | null): string =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso)) : "—";

const TH = "px-5 py-2.5 font-medium";

export default async function AdminPage() {
  /* At the top of the PAGE, not once in the layout. Layout-only gating is a
     known hole — ADR 15. */
  const admin = await requireAdmin();
  const proposals = await listProposals();

  /* Rótulos do deck PADRÃO, de propósito. `anchor_id` é um retrato tirado no
     momento da visita, então duas propostas podem discordar sobre como `#cases`
     se chama; somar as duas sob o rótulo padrão é a resposta certa para "onde a
     apresentação prende", que é a pergunta desta tela. Ver `portfolioAttention`. */
  const attention = await portfolioAttention(
    new Map(buildDefaultDeck().slides.map((node) => [node.id, node.label])),
  );

  return (
    <>
      <AdminTopBar email={admin.email} role={admin.role} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <PageHeader
          title="Propostas"
          description="Cada proposta é um deck congelado no nome de uma construtora, com link e senha próprios."
          action={<CreateProposalDialog />}
        />

        {/* Sem nenhuma proposta, quatro zeros e o vazio da lista dizem a mesma
            coisa duas vezes. O bloco entra junto com a primeira proposta. */}
        {proposals.length > 0 && <PortfolioOverview attention={attention} proposals={proposals} />}

        {proposals.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-medium">Nenhuma proposta ainda</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                A primeira começa do deck padrão. A personalização vem depois, nas abas.
              </p>
              <div className="mt-3">
                <CreateProposalDialog />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <th scope="col" className={TH}>
                      Construtora
                    </th>
                    <th scope="col" className={TH}>
                      Proposta
                    </th>
                    <th scope="col" className={TH}>
                      Status
                    </th>
                    <th scope="col" className={TH}>
                      Senha
                    </th>
                    <th scope="col" className={TH}>
                      Expira
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Aberturas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => {
                    const status = STATUS[proposal.status] ?? {
                      label: proposal.status,
                      tone: "neutral" as const,
                    };

                    return (
                      <tr
                        key={proposal.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <th scope="row" className="px-5 py-3 font-medium">
                          {proposal.clientName}
                        </th>
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/proposals/${proposal.id}`}
                            className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
                          >
                            {proposal.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {/* Uma proposta publicada sem senha não abre para
                              ninguém. É a falha silenciosa que esta lista mais
                              precisa deixar visível — daí ser um aviso, e não
                              um travessão. */}
                          {proposal.hasPassword ? (
                            <Badge tone="neutral">Definida</Badge>
                          ) : (
                            <Badge tone="warning">Sem senha</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {formatDate(proposal.expiresAt)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          {proposal.openCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
