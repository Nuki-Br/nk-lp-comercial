import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/admin/ui/Card";
import { ShareBar, StatTile } from "@/components/admin/ui/Stat";
import { formatDuration } from "@/lib/format";
import type { ProposalSummary } from "@/server/proposals/admin";
import type { PortfolioAttention } from "@/server/tracking/readout";

/* Os números do painel inteiro.
 *
 * Isto NÃO é analytics de terceiro, e a Regra 2 continua absoluta: nada aqui
 * coleta coisa alguma. É a leitura das duas tabelas que `/p/[slug]` já escreve
 * no nosso próprio Postgres, agregada para quem emitiu as propostas. Nenhum
 * pedido sai da nossa origem, nenhum SDK entra no `package.json`, e o código de
 * coleta continua morando só no caminho de render de `/p/[slug]`.
 *
 * Server component: os números chegam prontos e nada aqui é interativo. */

const formatMoment = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function PortfolioOverview({
  attention,
  proposals,
}: {
  attention: PortfolioAttention;
  /** A lista que a página já carregou — é dela que saem nome e título. */
  proposals: ProposalSummary[];
}) {
  const publishedCount = proposals.filter((p) => p.status === "published").length;

  /* Média por abertura, não por proposta: a pergunta é "quanto tempo uma pessoa
     passa lendo", e dividir por proposta misturaria uma lida por dez pessoas
     com dez propostas lidas por uma. */
  const averageMs =
    attention.sessionCount > 0 ? Math.round(attention.totalActiveMs / attention.sessionCount) : 0;

  const byId = new Map(proposals.map((p) => [p.id, p]));
  /* Propostas cuja linha sumiu da lista não têm nome para mostrar. Só acontece
     numa corrida entre as duas queries, e cair fora é melhor que uma linha
     anônima. */
  const mostRead = attention.proposals
    .map((row) => ({ row, proposal: byId.get(row.proposalId) }))
    .filter((entry): entry is { row: typeof entry.row; proposal: ProposalSummary } =>
      Boolean(entry.proposal),
    )
    .slice(0, 5);

  const topSlides = attention.slides.slice(0, 6);

  return (
    /* A entrada é escalonada em três degraus — cabeçalho da página, esta faixa
       de números, a lista abaixo — e não tile a tile. Um atraso por elemento
       precisaria de um `animationDelay` calculado, e o ganho seria uma onda de
       oito passos numa tela que se abre dezenas de vezes por dia. Três degraus
       dão a sensação de ordem; oito viram espera. */
    <section
      className="flex flex-col gap-4 animate-rise [animation-delay:60ms]"
      aria-labelledby="portfolio-heading"
    >
      <h2 id="portfolio-heading" className="sr-only">
        Números do painel
      </h2>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Propostas"
          value={proposals.length}
          hint={`${publishedCount} ${plural(publishedCount, "publicada", "publicadas")}`}
        />
        <StatTile
          label="Aberturas"
          value={attention.sessionCount}
          hint={`${attention.recentSessionCount} nos últimos 7 dias`}
        />
        <StatTile
          label="Leitores únicos"
          value={attention.readerCount}
          hint={
            attention.openedProposalCount > 0
              ? `em ${attention.openedProposalCount} ${plural(attention.openedProposalCount, "proposta", "propostas")}`
              : "nenhuma proposta aberta"
          }
        />
        <StatTile
          label="Tempo de leitura"
          value={formatDuration(attention.totalActiveMs)}
          hint={
            attention.sessionCount > 0
              ? `${formatDuration(averageMs)} por abertura`
              : "sem leitura registrada"
          }
        />
      </dl>

      {attention.sessionCount === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Os números aparecem quando o primeiro cliente abrir um link. Aberturas suas, com
              sessão de admin, nunca entram nesta conta — para testar a medição, abra o link numa
              janela anônima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Onde a atenção fica"
              description={
                attention.slideWindow.applied
                  ? `Tempo somado por slide nas ${attention.slideWindow.sessions} aberturas mais recentes.`
                  : "Tempo somado por slide, em todas as propostas."
              }
            />
            <CardContent>
              {topSlides.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum slide acumulou tempo suficiente para registrar.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {topSlides.map((slide) => (
                    <li key={slide.anchorId} className="group flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium">{slide.label}</span>
                        {/* O tempo sobe de cinza para o texto normal quando o
                            ponteiro passa: é o número que se está procurando ao
                            correr o olho pela lista. */}
                        <span className="shrink-0 text-xs text-muted-foreground transition-colors duration-200 tabular-nums group-hover:text-foreground">
                          {formatDuration(slide.dwellMs)}
                        </span>
                      </div>
                      {/* O trilho existe para a barra ter contra o que ser
                          comparada: sem ele, 20% e 25% são duas barras curtas
                          e indistinguíveis. */}
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <ShareBar share={slide.share} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Propostas mais lidas"
              description="Por tempo ativo do cliente, não por número de aberturas."
            />
            <CardContent>
              {/* Vazio com `sessionCount > 0` não é impossível: são duas
                  queries, e uma proposta apagada entre elas deixa sessões sem
                  nome para mostrar. Uma `<ul>` vazia pareceria um bug. */}
              {mostRead.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  As aberturas registradas não pertencem a nenhuma proposta ativa.
                </p>
              )}
              <ul className="flex flex-col divide-y divide-border">
                {mostRead.map(({ row, proposal }) => (
                  <li
                    key={row.proposalId}
                    className="group flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/proposals/${proposal.id}`}
                        className="inline-flex max-w-full items-center gap-1 truncate rounded-sm text-sm font-medium underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
                      >
                        <span className="truncate">{proposal.clientName}</span>
                        <span
                          aria-hidden="true"
                          className="-translate-x-1 shrink-0 text-muted-foreground opacity-0 transition-[translate,opacity] duration-200 ease-out-quart group-hover:translate-x-0 group-hover:opacity-100"
                        >
                          →
                        </span>
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.sessionCount} {plural(row.sessionCount, "abertura", "aberturas")} · até{" "}
                        {formatMoment(row.lastSeenAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatDuration(row.activeMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
