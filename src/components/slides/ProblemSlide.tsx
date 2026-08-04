import { problemCards } from "@/content/deck";

export function ProblemSlide() {
  return (
    <section className="slide problem" id="problem" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">O problema</p>
          <h2 className="reveal">
            A personalização de unidades acontece hoje em três etapas —{" "}
            <em>manuais e desconectadas.</em>
          </h2>
          <p className="lead reveal">
            Cada etapa tem sua própria dor. E todas viraram um custo invisível dentro da construtora: retrabalho, risco jurídico e insatisfação do cliente.
          </p>
        </div>

        <div className="cards">
          {problemCards.map((c) => (
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
