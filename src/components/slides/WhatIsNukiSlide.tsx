import { moduleFlow } from "@/content/deck";

export function WhatIsNukiSlide() {
  return (
    <section className="slide what-is-nuki" id="what-is-nuki" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">O que é a Nuki</p>
          <h2 className="reveal">
            A camada de gestão de todo o ciclo de personalização —{" "}
            <em>em uma plataforma só.</em>
          </h2>
          <p className="lead reveal">
            A Nuki transforma um processo manual e fragmentado em um ciclo estruturado, integrado e escalável — da formação de custo do memorial à entrega validada em obra.
          </p>
        </div>

        <div className="flow reveal">
          {moduleFlow.map((m) => (
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
