/* Assets já vivem em /public/carrossel-logos/ (mesmos do CarrosselLogos da home).
   Mantenho a lista local pra desacoplar as duas seções — se um dia a home
   trocar a ordem/composição, o /comercial não precisa acompanhar. */
const logos = [
  { name: "Fibra", file: "/carrossel-logos/fibra-logo.png", width: 226, height: 30 },
  { name: "Patriani", file: "/carrossel-logos/patriani-logo.png", width: 226, height: 37 },
  { name: "Piemonte", file: "/carrossel-logos/piemonte-logo.png", width: 226, height: 48 },
  { name: "Mampei", file: "/carrossel-logos/mampei-logo.png", width: 200, height: 30 },
];

export function CasesSlide() {
  return (
    <section className="slide cases" id="cases" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">Cases</p>
          <h2 className="reveal">
            Construtoras que já <em>saíram da planilha.</em>
          </h2>
          <p className="lead reveal">
            Construtoras que já organizaram o ciclo de personalização com a Nuki.
          </p>
        </div>

        <div className="cases-grid">
          {logos.map((logo) => (
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
