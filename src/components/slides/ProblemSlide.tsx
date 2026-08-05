import { SectionHead } from "@/components/slides/SectionHead";
import type { ProblemNode } from "@/deck/types";

export function ProblemSlide({ node }: { node: ProblemNode }) {
  return (
    <section className="slide problem" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="cards">
          {node.cards.map((c) => (
            <article className="card reveal" key={c.step}>
              <span className="step">{c.step}</span>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <p className="pain">{c.pain}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
