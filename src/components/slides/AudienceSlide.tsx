import { SectionHead } from "@/components/slides/SectionHead";
import type { AudienceNode } from "@/deck/types";

export function AudienceSlide({ node }: { node: AudienceNode }) {
  return (
    <section className="slide audience" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="personas">
          {node.personas.map((p) => (
            <article className="persona reveal" key={p.name}>
              <span className="role">{p.role}</span>
              <h3>{p.name}</h3>
              <p className="persona-label">{node.labels.focus}</p>
              <p className="focus">{p.foco}</p>
              <p className="persona-label">{node.labels.pain}</p>
              <p className="pain">{p.pain}</p>
            </article>
          ))}
        </div>

        <div className="fit reveal">
          <h3>{node.fit.title}</h3>
          <ul>
            {node.fit.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
