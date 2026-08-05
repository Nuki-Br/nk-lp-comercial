import { SectionHead } from "@/components/slides/SectionHead";
import type { CasesNode } from "@/deck/types";

export function CasesSlide({ node }: { node: CasesNode }) {
  return (
    <section className="slide cases" id={node.id} data-tone={node.tone} data-reveal-group="">
      <div className="slide-inner">
        <SectionHead head={node.head} />

        <div className="cases-grid">
          {node.logos.map((logo) => (
            <article className="cases-card reveal" key={logo.name}>
              <img
                src={logo.file}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                loading="lazy"
                decoding="async"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
