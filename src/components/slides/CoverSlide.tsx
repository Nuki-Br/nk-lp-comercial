import { Fragment } from "react";
import { RichText } from "@/components/ui/RichText";
import type { CoverNode } from "@/deck/types";

export function CoverSlide({ node }: { node: CoverNode }) {
  return (
    <section className="slide cover" id={node.id} data-tone={node.tone} data-reveal-group="">
      {/* A apresentação não é mais a raiz deste repo, mas o "voltar" continua
          apontando pra home institucional em outro domínio — link absoluto,
          não `next/link`. */}
      <a href={node.backLink.href} className="back-link" aria-label={node.backLink.ariaLabel}>
        <ChevronLeftIcon className="back-link-icon" />
      </a>
      <div className="slide-inner">
        <p className="kicker reveal">{node.kicker}</p>
        <h1 className="reveal">
          <RichText value={node.title} />
        </h1>
        <p className="lead reveal">
          <RichText value={node.lead} />
        </p>
        <div className="meta reveal">
          {node.meta.items.map((item, i) => (
            <Fragment key={item}>
              {i > 0 && <span>{node.meta.separator}</span>}
              <span>{item}</span>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.5 14.41C12.82 14.08 12.82 13.56 12.5 13.23L9.27 10L12.5 6.77C12.82 6.44 12.82 5.92 12.5 5.59C12.17 5.27 11.65 5.27 11.32 5.59L7.5 9.42C7.17 9.74 7.17 10.26 7.5 10.58L11.32 14.41C11.65 14.73 12.17 14.73 12.5 14.41Z" />
    </svg>
  );
}
