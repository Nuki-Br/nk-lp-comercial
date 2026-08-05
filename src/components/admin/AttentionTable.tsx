import type { ProposalAttention } from "@/server/tracking/readout";

/* A table and CSS bars. Rule 3 bans chart libraries by name, and this is the
   case that shows why the ban costs nothing: one column of divs whose width is a
   percentage says everything a bar chart would, in markup a screen reader can
   read out and a printer can print.

   Server component — the numbers arrive already aggregated and nothing here is
   interactive. */

/** Minutes and seconds, from Intl-free arithmetic: `Intl.DurationFormat` is not
    in the Node version this builds on, and Rule 3 has no room for a date
    library to render "4 min 12 s". */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

const formatMoment = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

export function AttentionTable({ attention }: { attention: ProposalAttention }) {
  if (attention.sessionCount === 0) {
    return (
      <p className="text-sm text-nuki-gray-mid">
        Ninguém abriu esta proposta ainda. Aberturas suas, com sessão de admin, não entram nesta
        conta.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-nuki-gray-7">
            Primeira abertura
          </dt>
          <dd className="text-sm font-semibold">{formatMoment(attention.firstOpenAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-nuki-gray-7">
            Última atividade
          </dt>
          <dd className="text-sm font-semibold">{formatMoment(attention.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-nuki-gray-7">
            Aberturas
          </dt>
          <dd className="text-sm font-semibold tabular-nums">{attention.sessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-nuki-gray-7">
            Tempo ativo total
          </dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatDuration(attention.totalActiveMs)}
          </dd>
        </div>
      </dl>

      {attention.slides.length === 0 ? (
        <p className="text-sm text-nuki-gray-mid">
          A proposta foi aberta, mas nenhum slide acumulou tempo suficiente para registrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Tempo de leitura por slide, do mais lido para o menos lido
            </caption>
            <thead className="border-b border-nuki-gray-divider text-xs uppercase tracking-wide text-nuki-gray-7">
              <tr>
                <th scope="col" className="py-2 font-semibold">
                  Slide
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Tempo
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Voltas
                </th>
              </tr>
            </thead>
            <tbody>
              {attention.slides.map((slide) => (
                <tr
                  key={slide.anchorId}
                  className="border-b border-nuki-gray-divider last:border-0"
                >
                  <th scope="row" className="py-2 pr-4 font-semibold">
                    {slide.label}
                  </th>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      {/* The bar. `aria-hidden` because the number beside it is
                          the same fact, and a screen reader reading both would
                          say it twice. */}
                      <div
                        aria-hidden="true"
                        className="h-2 min-w-[2px] rounded-full bg-nuki-green-02"
                        style={{ width: `${Math.round(slide.share * 100)}%` }}
                      />
                      <span className="shrink-0 tabular-nums">{formatDuration(slide.dwellMs)}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{slide.enterCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
