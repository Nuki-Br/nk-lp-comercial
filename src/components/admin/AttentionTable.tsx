import type { ReactNode } from "react";
import { ShareBar } from "@/components/admin/ui/Stat";
import { formatDuration } from "@/lib/format";
import type { ProposalAttention } from "@/server/tracking/readout";

/* A table and CSS bars. Rule 3 bans chart libraries by name, and this is the
   case that shows why the ban costs nothing: one column of divs whose width is a
   percentage says everything a bar chart would, in markup a screen reader can
   read out and a printer can print.

   Server component — the numbers arrive already aggregated and nothing here is
   interactive.

   Os quatro números do topo NÃO são `StatTile`. O tile emoldurado é do painel
   inicial, onde quatro caixas em fila são o conteúdo da tela; aqui eles vivem
   dentro de uma seção que já tem título e fio próprios, e a moldura viraria uma
   caixa dentro de outra. */

const formatMoment = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

/** Rótulo pequeno, número grande, sem caixa. */
function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      {/* `tabular-nums` não é cosmético: números de largura variável lado a lado
          dançam a cada revalidação. */}
      <dd className="text-base leading-none font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

export function AttentionTable({ attention }: { attention: ProposalAttention }) {
  if (attention.sessionCount === 0) {
    return (
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        Ninguém abriu esta proposta ainda. Aberturas suas, com sessão de admin, não entram nesta
        conta — para testar a medição, abra o link numa janela anônima.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Figure label="Primeira abertura" value={formatMoment(attention.firstOpenAt)} />
        <Figure label="Última atividade" value={formatMoment(attention.lastSeenAt)} />
        <Figure label="Aberturas" value={attention.sessionCount} />
        <Figure label="Tempo ativo total" value={formatDuration(attention.totalActiveMs)} />
      </dl>

      {attention.slides.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          A proposta foi aberta, mas nenhum slide acumulou tempo suficiente para registrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
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
                      {/* O trilho existe para a barra ter contra o que ser
                          comparada: sem ele, 20% e 25% são duas barras curtas e
                          indistinguíveis. */}
                      <div className="h-1.5 w-full min-w-12 rounded-full bg-muted">
                        <ShareBar share={slide.share} />
                      </div>
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
