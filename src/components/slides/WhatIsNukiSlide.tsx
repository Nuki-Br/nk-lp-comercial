import { moduleFlow } from "@/content/deck";

export function WhatIsNukiSlide() {
  return (
    <section className="cm-section o-que-e" id="what-is-nuki" data-reveal-group="">
      <div className="cm-wrap">
        <div className="cm-head">
          <p className="tag reveal">O que é a Nuki</p>
          <h2 className="reveal">
            A camada de gestão de todo o ciclo de personalização —{" "}
            <em>em uma plataforma só.</em>
          </h2>
          <p className="lead reveal">
            A Nuki transforma um processo manual e fragmentado em um ciclo estruturado, integrado e escalável — da formação de custo do memorial à entrega validada em obra.
          </p>
        </div>

        <div className="fluxo reveal">
          {moduleFlow.map((m) => (
            <div className="step" key={m.name}>
              <span className="fase">{m.phase}</span>
              <span className="nome">{m.name}</span>
              <p className="desc">{m.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
