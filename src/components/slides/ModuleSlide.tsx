"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ModuleData, ModuleScreenshot } from "@/content/modules";

const AUTO_ADVANCE_MS = 5000;

/**
 * Slide de um módulo (Planner · Personaliza · Inspetor) no padrão da apresentação
 * comercial. Layout 2-col estático:
 *   ┌─ COPY (~40%)                         ┌─ SHOT (~60%) ────────────┐
 *   │  tag                                 │                          │
 *   │  título grande                       │  screenshot ativo do beat│
 *   │  descrição                           │  (cross-fade ao trocar)  │
 *   │  ▸ tabs verticais dos beats          │                          │
 *   │  ▸ descrição do beat ativo           │                          │
 *   │  ▸ 2 highlights                      │                          │
 *   │  → Saiba mais                        │                          │
 *   └─                                     └──────────────────────────┘
 *
 * Auto-advance dos beats a cada AUTO_ADVANCE_MS, pausa on hover/focus na seção
 * inteira. `prefers-reduced-motion` desliga o auto-advance (user controla via
 * click). Nada scroll-driven — a slide é 100% estática.
 */
/**
 * Precedência dos CTAs: apps no ar (`links`) > demo embutida (`demoUrl`) >
 * "Saiba mais" da página de recurso. Quando o módulo já tem produto público,
 * mandar o prospect pro app real vale mais do que qualquer demo.
 */
export function ModuleSlide({
  data,
  index,
}: {
  data: ModuleData;
  index: number;
}) {
  const [activeBeat, setActiveBeat] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  /* Timer dos beats só roda quando a seção está de fato visível — evita gastar
     ciclos (e "queimar" beats) enquanto o módulo está fora da viewport. */
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || isPaused || !isVisible || data.beats.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveBeat((prev) => (prev + 1) % data.beats.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, isVisible, data.beats.length]);

  const beat = data.beats[activeBeat];
  const isPhone = data.beats[0]?.shot.kind === "phone";
  const panelId = `${data.id}-panel`;

  return (
    <section
      ref={sectionRef}
      className={`slide module-slide${isPhone ? " is-phone" : " is-desktop"}`}
      id={data.id}
      data-reveal-group=""
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Numeral gigante "01/02/03" de fundo — herda estilo base de
          `.jornada .bgnum` (jornada.css:95-105) já importado. Parallax nativo
          via animation-timeline: view() ou fallback JS do ComercialScripts. */}
      <span className="bg-numeral" data-parallax="-70" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      {/* Pearl decorativa — mesma linguagem do /antiga (SobreANuki, FaleComAGente).
          Off-canvas parcial, borrada, transparente — assinatura de marca sem
          competir com o produto. */}
      <Image
        src="/sobre-a-nuki/nuki_quadradinho_pearl 5.svg"
        alt=""
        width={240}
        height={240}
        className="module-slide-pearl"
        aria-hidden="true"
      />
      <div className="slide-inner">
        <div className="module-slide-grid">
          {/* -------- Coluna esquerda: cópia + tabs + highlights -------- */}
          <div className="module-slide-copy">
            <p className="tag reveal">{data.tag}</p>
            <h2 className="reveal">
              <span className="module-slide-h2-pre">{data.title.pre}</span>{" "}
              <strong>{data.title.strong}</strong>
            </h2>
            <p className="lead reveal">{data.description}</p>

            <ul
              className="module-slide-tabs reveal"
              role="tablist"
              aria-label={`Recursos do ${data.title.strong}`}
            >
              {data.beats.map((b, i) => (
                <li key={b.shot.base} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    id={`${data.id}-tab-${i}`}
                    aria-selected={i === activeBeat}
                    aria-controls={panelId}
                    tabIndex={i === activeBeat ? 0 : -1}
                    className={`module-slide-tab${i === activeBeat ? " is-active" : ""}`}
                    onClick={() => setActiveBeat(i)}
                  >
                    <span className="module-slide-tab-num">
                      Beat {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="module-slide-tab-title">{b.title}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div
              className="module-slide-detail"
              id={panelId}
              role="tabpanel"
              aria-labelledby={`${data.id}-tab-${activeBeat}`}
            >
              <p key={beat.description} className="module-slide-detail-desc">
                {beat.description}
              </p>
            </div>

            <div className="module-slide-highlights reveal">
              {data.highlights.map((h) => (
                <div className="module-slide-hl" key={h.label}>
                  <span className="module-slide-hl-num">
                    {(h.prefix ?? "") + h.target + (h.suffix ?? "")}
                  </span>
                  <span className="module-slide-hl-lbl">{h.label}</span>
                </div>
              ))}
            </div>

            {data.links?.length ? (
              <div className="module-slide-ctas reveal">
                {data.links.map((l) => (
                  <a
                    key={l.href}
                    className="module-slide-cta"
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="module-slide-cta-glyph" aria-hidden="true">
                      ↗
                    </span>
                    {l.label}
                  </a>
                ))}
              </div>
            ) : data.demoUrl ? (
              <button
                type="button"
                className="module-slide-cta reveal"
                onClick={() => {
                  document
                    .getElementById(`${data.id}-demo`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="module-slide-cta-glyph" aria-hidden="true">
                  ▷
                </span>
                Explorar o {data.title.strong}
              </button>
            ) : (
              <a className="module-slide-link reveal" href={data.learnMoreHref}>
                Saiba mais <span aria-hidden="true">→</span>
              </a>
            )}
          </div>

          {/* -------- Coluna direita: mídia (vídeo quando disponível, cross-fade
              de screenshots como fallback) --------

              TODO — ativação do vídeo YouTube quando o primeiro material chegar:
              1. `npm install @next/third-parties@latest` (antes verificar API na
                 versão instalada do Next em `node_modules/next/dist/docs/`)
              2. `import { YouTubeEmbed } from "@next/third-parties/google";`
              3. Substituir o bloco `{data.videoUrl ? (...) : (...)}` abaixo por:
                   {data.videoUrl ? (
                     <div className="module-slide-video">
                       <YouTubeEmbed videoid={data.videoUrl} params="rel=0" />
                     </div>
                   ) : (...)}
              4. Setar `videoUrl` no módulo alvo em `modulos.data.ts`.
              Enquanto `videoUrl` estiver undefined pra um módulo, o cross-fade
              de screenshots roda normalmente. */}
          <div className="module-slide-shot">
            <div className="module-slide-shot-stage">
              {data.beats.map((b, i) => (
                <ScreenshotSlot
                  key={b.shot.base}
                  shot={b.shot}
                  active={i === activeBeat}
                  eager={i === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Slot de imagem no stage do cross-fade. Cada beat monta a sua slot; apenas a
 * com .on tem opacity 1, as demais ficam invisíveis mas montadas — troca via
 * transition de CSS, sem remount. Cópia enxuta do <Shot> do JourneyModule com
 * srcSet + sizes adaptados ao layout novo (fixed max-width por tipo).
 */
function ScreenshotSlot({
  shot,
  active,
  eager,
}: {
  shot: ModuleScreenshot;
  active: boolean;
  eager: boolean;
}) {
  const { base, kind, alt } = shot;
  const loading = eager ? undefined : "lazy";
  const cls = `module-slide-shot-slot${active ? " is-active" : ""}`;

  if (kind === "phone") {
    return (
      <picture className={cls}>
        <source
          type="image/webp"
          srcSet={`/jornada/${base}-320.webp 320w, /jornada/${base}-640.webp 640w, /jornada/${base}-960.webp 960w`}
          sizes="(min-width: 900px) 320px, 280px"
        />
        <img
          src={`/jornada/${base}-320.png`}
          width={2160}
          height={3840}
          alt={alt}
          loading={loading}
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <picture className={cls}>
      <source
        type="image/webp"
        srcSet={`/jornada/${base}-740.webp 740w, /jornada/${base}-1480.webp 1480w, /jornada/${base}-2220.webp 2220w`}
        sizes="(min-width: 1280px) 780px, (min-width: 900px) 58vw, 92vw"
      />
      <img
        src={`/jornada/${base}-740.png`}
        width={2560}
        height={1600}
        alt={alt}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
