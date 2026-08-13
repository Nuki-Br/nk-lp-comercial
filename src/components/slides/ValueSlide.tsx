import { SectionHead } from "@/components/slides/SectionHead";
import type { ValueNode } from "@/deck/types";

/**
 * Segundo frame do deck, logo após a capa: estabelece a tese comercial antes
 * de qualquer menção ao problema, para que o frame seguinte (ProblemSlide)
 * seja lido como "e é isso que hoje trava esse ganho" em vez de abrir a
 * apresentação no tom defensivo. Cada número vem com a fonte visível, porque
 * é aqui que o prospect costuma perguntar "de onde saiu isso?".
 */
export function ValueSlide({ node }: { node: ValueNode }) {
  return (
    <section className="slide value" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="value-body">
          <figure className="value-quote reveal">
            <blockquote>
              {node.quote.segments.map((s) =>
                s.emphasis ? (
                  <strong key={s.text}>{s.text}</strong>
                ) : (
                  <span key={s.text}>{s.text}</span>
                ),
              )}
            </blockquote>
            <figcaption>
              <span className="value-quote-author">{node.quote.author}</span>
              <span className="value-quote-detail">{node.quote.detail}</span>
            </figcaption>
          </figure>

          <ul className="value-evidence">
            {node.evidence.map((e) => (
              <li className="value-evidence-item reveal" key={e.title}>
                <span className="value-evidence-metric">{e.metric}</span>
                <div className="value-evidence-text">
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                  <span className="value-evidence-source">{e.source}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
