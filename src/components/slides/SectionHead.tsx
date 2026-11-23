import { RichText } from "@/components/ui/RichText";
import type { SectionHead as SectionHeadValue } from "@/deck/types";

/**
 * O bloco `.section-head` — tag / h2 / lead — repetido por oito slides.
 *
 * `lead` é condicional: um cabeçalho pode vir sem ele, e emitir um
 * `<p class="lead reveal">` vazio acrescentaria um elemento ao DOM.
 */
export function SectionHead({ head }: { head: SectionHeadValue }) {
  return (
    <div className="section-head">
      <p className="tag reveal">{head.tag}</p>
      <h2 className="reveal">
        <RichText value={head.title} />
      </h2>
      {head.lead !== undefined && (
        <p className="lead reveal">
          <RichText value={head.lead} />
        </p>
      )}
    </div>
  );
}
