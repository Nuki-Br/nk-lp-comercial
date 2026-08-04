import { personas, fitList } from "@/content/deck";

export function AudienceSlide() {
  return (
    <section className="cm-section publico" id="publico" data-reveal-group="">
      <div className="cm-wrap">
        <div className="cm-head">
          <p className="tag reveal">Pra quem serve</p>
          <h2 className="reveal">
            Feita pra quem gerencia personalização{" "}
            <em>de verdade.</em>
          </h2>
          <p className="lead reveal">
            Três personas dentro da construtora, cada uma com uma dor específica — e um objetivo comum: acabar com o retrabalho.
          </p>
        </div>

        <div className="personas">
          {personas.map((p) => (
            <article className="persona reveal" key={p.name}>
              <span className="role">{p.role}</span>
              <h3>{p.name}</h3>
              <p className="rot">Foco</p>
              <p className="foco">{p.foco}</p>
              <p className="rot">Dor típica</p>
              <p className="dor">{p.pain}</p>
            </article>
          ))}
        </div>

        <div className="fit reveal">
          <h3>Quando a Nuki faz mais sentido</h3>
          <ul>
            {fitList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
