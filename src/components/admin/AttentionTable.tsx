import { ShareBar, StatTile } from "@/components/admin/ui/Stat";
import { formatDuration } from "@/lib/format";
import type { ProposalAttention } from "@/server/tracking/readout";

/* A table and CSS bars. Rule 3 bans chart libraries by name, and this is the
   case that shows why the ban costs nothing: one column of divs whose width is a
   percentage says everything a bar chart would, in markup a screen reader can
   read out and a printer can print.

   Server component — the numbers arrive already aggregated and nothing here is
   interactive. */

const formatMoment = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

export function AttentionTable({ attention }: { attention: ProposalAttention }) {
  if (attention.sessionCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ninguém abriu esta proposta ainda. Aberturas suas, com sessão de admin, não entram nesta
        conta.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Data e hora não cabem no corpo de 2xl do tile — `text-base` aqui, e o
          `StatTile` continua sendo o mesmo componente do topo do painel. */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 [&_dd>span:first-child]:text-base">
        <StatTile label="Primeira abertura" value={formatMoment(attention.firstOpenAt)} />
        <StatTile label="Última atividade" value={formatMoment(attention.lastSeenAt)} />
        <StatTile label="Aberturas" value={attention.sessionCount} />
        <StatTile label="Tempo ativo total" value={formatDuration(attention.totalActiveMs)} />
      </dl>

      {attention.slides.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          A proposta foi aberta, mas nenhum slide acumulou tempo suficiente para registrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Tempo de leitura por slide, do mais lido para o menos lido
            </caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Slide
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Tempo
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Voltas
                </th>
              </tr>
            </thead>
            <tbody>
              {attention.slides.map((slide) => (
                <tr key={slide.anchorId} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2.5 pr-4 font-medium">
                    {slide.label}
                  </th>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-3">
                      <ShareBar share={slide.share} />
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {formatDuration(slide.dwellMs)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{slide.enterCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
