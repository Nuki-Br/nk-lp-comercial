import { SectionHead } from "@/components/slides/SectionHead";
import type { WhatIsNukiNode } from "@/deck/types";

export function WhatIsNukiSlide({ node }: { node: WhatIsNukiNode }) {
  return (
    <section className="slide what-is-nuki" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="flow reveal">
          {node.flow.map((m) => (
            <div className="step" key={m.name}>
              <span className="phase">{m.phase}</span>
              <span className="name">{m.name}</span>
              <p className="description">{m.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
