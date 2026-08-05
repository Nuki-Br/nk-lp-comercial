import { SectionHead } from "@/components/slides/SectionHead";
import type { DifferentiatorsNode } from "@/deck/types";

export function DifferentiatorsSlide({ node }: { node: DifferentiatorsNode }) {
  return (
    <section
      className="slide differentiators"
      id={node.id}
      data-tone={node.tone}
      data-reveal-group=""
    >
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="grid">
          {node.items.map((d) => (
            <article className="item reveal" key={d.n}>
              <span className="n">{d.n}</span>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
