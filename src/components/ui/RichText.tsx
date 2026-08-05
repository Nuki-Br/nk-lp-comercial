import { Fragment } from "react";
import type { RichText as RichTextValue } from "@/deck/types";

/**
 * Renderiza uma `RichText` — texto com ênfase inline vinda da configuração.
 *
 * Nove títulos de slide embutem um `<em>` no meio da frase e o atalho de teclado
 * embute dois `<kbd>`. Guardar isso como HTML numa string exigiria
 * `dangerouslySetInnerHTML` sobre conteúdo que na etapa 2 vem do banco; um array
 * de segmentos é dado, não markup.
 *
 * A identidade do DOM se sustenta porque segmentos de texto adjacentes viram
 * text nodes irmãos, e `outerHTML` serializa isso igual ao JSX original. Só vale
 * no cliente: o deck inteiro é client-rendered (o `AccessGate` devolve `false`
 * no `getServerSnapshot`), então não há separadores `<!-- -->` de SSR no meio.
 */
export function RichText({ value }: { value: RichTextValue }) {
  if (typeof value === "string") return <>{value}</>;

  return (
    <>
      {value.map((span, i) => {
        if (typeof span === "string") return <Fragment key={i}>{span}</Fragment>;
        if ("em" in span) return <em key={i}>{span.em}</em>;
        return <kbd key={i}>{span.kbd}</kbd>;
      })}
    </>
  );
}
