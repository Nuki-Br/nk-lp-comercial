import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CreateProposalDialog } from "@/components/admin/CreateProposalDialog";
import { PortfolioOverview } from "@/components/admin/PortfolioOverview";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Card, PageHeader } from "@/components/admin/ui/Card";
import { buildDefaultDeck } from "@/deck/defaults";
import { formatCurrency } from "@/lib/format";
import { QUOTE_REFERENCE_MONTHS } from "@/lib/quote";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { listProposals } from "@/server/proposals/admin";
import { portfolioAttention } from "@/server/tracking/readout";

/* Session-bound and never cacheable. */
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  published: { label: "Publicada", tone: "success" },
  unpublished: { label: "Despublicada", tone: "warning" },
  archived: { label: "Arquivada", tone: "neutral" },
};

/* A date, in pt-BR, from Intl — no date library (Rule 3). */
const formatDate = (iso: string | null): string =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso)) : "—";

/** Mais larga que o `max-w-5xl` que era o padrão do painel, pelo mesmo motivo
    que o compositor: a lista passou a carregar três colunas de dinheiro, e a
    5xl as empurrava para fora da tela — um total que só aparece rolando de lado
    é um total que ninguém compara. Mesma largura do compositor, para as duas
    telas não trocarem de coluna a cada navegação. */
const CONTAINER = "max-w-7xl";

const TH = "px-5 py-2.5 font-medium";
/* As três colunas de dinheiro andam juntas: mesmo alinhamento, mesma tabular,
   e um fio à esquerda do grupo para que a leitura horizontal saiba onde o
   cadastro acaba e o valor começa. */
const TH_MONEY = `${TH} text-right`;
const TD_MONEY = "px-5 py-3 text-right tabular-nums";

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
      <AdminTopBar email={admin.email} role={admin.role} container={CONTAINER} />

      <main className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 ${CONTAINER}`}>
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
              {/* 46rem → 68rem: as três colunas de dinheiro não cabiam sem
                  espremer o nome da construtora, e uma tabela apertada rola —
                  ela não deixa de ser legível. */}
              <table className="w-full min-w-[68rem] border-collapse text-left text-sm">
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
                    <th scope="col" className={`${TH_MONEY} border-l border-border`}>
                      Mensalidade
                    </th>
                    <th scope="col" className={TH_MONEY}>
                      Setup de imagens
                    </th>
                    <th scope="col" className={TH_MONEY}>
                      Total em {QUOTE_REFERENCE_MONTHS} meses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => {
                    const status = STATUS[proposal.status] ?? {
                      label: proposal.status,
                      tone: "neutral" as const,
                    };

                    const quote = proposal.quote;
                    /* Uma proposta publicada é cotada pelo documento congelado,
                       um rascunho pelo que publicar congelaria. A diferença
                       importa quando as duas coisas discordam — e nessa hora a
                       coluna de status sozinha não diz qual das duas está na
                       tela. */
                    const quoteSourceHint =
                      proposal.quoteSource === "snapshot"
                        ? "Valores do documento publicado."
                        : "Valores do rascunho — ainda não enviados.";

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

                        {/* As três cifras, na ordem em que a conta é feita:
                            mensalidade → setup → total. Cada linha de apoio diz
                            de onde o número de cima veio, que é a pergunta que
                            uma tabela de dinheiro sempre provoca. */}
                        <td className={`${TD_MONEY} border-l border-border`}>
                          <span className="font-medium">
                            {formatCurrency(quote.monthlyAfterDiscount)}
                          </span>
                          {quote.cycle && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {quote.cycle.label}
                              {quote.cycle.discount > 0 &&
                                ` −${Math.round(quote.cycle.discount * 100)}%`}
                            </span>
                          )}
                        </td>
                        <td className={TD_MONEY}>
                          <span className="font-medium">{formatCurrency(quote.imageCost)}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {quote.imageCount} imagens
                          </span>
                        </td>
                        <td className={TD_MONEY} title={quoteSourceHint}>
                          {/* Um ponto maior que as outras duas: é a soma delas,
                              e é a cifra que faz a lista ser lida de cima a
                              baixo em vez de linha a linha. */}
                          <span className="text-base font-semibold">
                            {formatCurrency(quote.grandTotal)}
                          </span>
                          {/* Só quando o teto do simulador desta proposta não
                              alcança os meses de referência — aí o cabeçalho da
                              coluna estaria mentindo sobre esta linha. */}
                          {quote.months !== QUOTE_REFERENCE_MONTHS && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              em {quote.months} {quote.months === 1 ? "mês" : "meses"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* O rodapé existe porque as três colunas escondem duas escolhas
                que ninguém adivinha olhando as cifras: o prazo é arbitrado
                aqui, e as imagens são as da ABERTURA da calculadora — o cliente
                mexe nela durante a apresentação, e o número dele será outro. */}
            <p className="border-t border-border bg-muted/20 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
              Total = setup de imagens + {QUOTE_REFERENCE_MONTHS} meses do plano em destaque, já com
              o desconto do ciclo. É uma referência para comparar propostas: o cliente ainda ajusta
              a calculadora durante a apresentação, e os meses são dele.
            </p>
          </Card>
        )}
      </main>
    </>
  );
}
