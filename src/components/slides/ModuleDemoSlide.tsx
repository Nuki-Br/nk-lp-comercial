"use client";

import { useState } from "react";
import type { ModuleData } from "@/content/modules";

/**
 * Slide fullscreen com a demo interativa do módulo dentro de um iframe.
 * Renderiza logo após o ModuloSlide descritivo (id `${data.id}-demo`) quando
 * `data.demoUrl` está setado. Estrutura:
 *
 *   ┌── barra chrome (48px) ───────────────────────────────┐
 *   │ [Title · Demo]                     × Voltar (ESC/←)  │
 *   ├──────────────────────────────────────────────────────┤
 *   │                                                       │
 *   │            iframe {data.demoUrl}                      │
 *   │                                                       │
 *   └──────────────────────────────────────────────────────┘
 *
 * - Barra permite retornar pro descritivo sem depender do foco (o click no ×
 *   funciona mesmo quando o foco está dentro do iframe, diferente de ESC).
 * - Skeleton overlay some quando `onLoad` do iframe dispara.
 * - Mobile (<900px): oculta o iframe e mostra fallback com "abrir em nova aba".
 *
 * Nota sobre ESC quando foco está dentro do iframe: keydown do window pai não
 * dispara. MVP usa só o botão × Voltar. Fase 2 pode injetar postMessage no HTML
 * do Planner pra mandar 'demo:back' pro pai.
 */
export function ModuleDemoSlide({ data }: { data: ModuleData }) {
  const [loaded, setLoaded] = useState(false);

  if (!data.demoUrl) return null;

  const demoId = `${data.id}-demo`;

  /** Navega entre os slides walkable a partir do demo. dir = -1 volta pro
      descritivo do mesmo módulo, dir = 1 vai pro próximo módulo (ou seção)
      na ordem em que aparecem no DOM. Reusa a mesma lista que o
      ComercialScripts monta pra setas globais — nada de props/ref. */
  const navigate = (dir: -1 | 1) => {
    if (typeof document === "undefined") return;
    const walkable = Array.from(
      document.querySelectorAll<HTMLElement>(".slide, .module"),
    ).filter((el) => el.id);
    const currentIdx = walkable.findIndex((el) => el.id === demoId);
    if (currentIdx === -1) return;
    const target = walkable[currentIdx + dir];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      className="slide is-fullscreen module-demo-slide"
      id={demoId}
      data-back-target={data.id}
    >
      <header className="module-demo-bar">
        <button
          type="button"
          className="module-demo-bar-nav"
          onClick={() => navigate(-1)}
          aria-label={`Voltar para ${data.title.strong}`}
          title="Voltar (←)"
        >
          <span aria-hidden="true">←</span> Voltar
        </button>

        <span className="module-demo-bar-title">
          <strong>{data.title.strong}</strong>
          <span className="module-demo-bar-sep">·</span>
          <span className="module-demo-bar-suffix">Demo interativa</span>
        </span>

        <button
          type="button"
          className="module-demo-bar-nav"
          onClick={() => navigate(1)}
          aria-label="Seguir para a próxima seção"
          title="Seguir (→)"
        >
          Seguir <span aria-hidden="true">→</span>
        </button>
      </header>

      <div className="module-demo-stage">
        {/* Iframe full width/height; onLoad esconde o skeleton */}
        <iframe
          className="module-demo-frame"
          src={data.demoUrl}
          title={`${data.title.strong} — demo interativa`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />

        {!loaded && (
          <div className="module-demo-skeleton" aria-hidden="true">
            <div className="module-demo-skeleton-pulse" />
            <p className="module-demo-skeleton-text">Carregando demo…</p>
          </div>
        )}

        {/* Mobile fallback — CSS controla a visibilidade */}
        <div className="module-demo-mobile" role="note">
          <p className="module-demo-mobile-title">Demo funciona melhor no desktop</p>
          <p className="module-demo-mobile-body">
            O {data.title.strong} foi feito pra tela larga. No celular, abra em uma nova aba pra explorar com espaço.
          </p>
          <a
            className="module-demo-mobile-link"
            href={data.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir em nova aba →
          </a>
        </div>
      </div>
    </section>
  );
}
