"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModuleData } from "@/content/modules";

/**
 * Slide fullscreen com a demo interativa do módulo dentro de um iframe.
 * Renderiza logo após o ModuloSlide descritivo (id `${data.id}-demo`) quando
 * `data.demoUrl` está setado. Estrutura:
 *
 *   ┌── barra chrome (44px, sticky) ───────────────────────────┐
 *   │ ← Voltar        [Title · Demo]              Seguir →     │
 *   ├──────────────────────────────────────────────────────────┤
 *   │                                                          │
 *   │            iframe {data.demoUrl}                         │
 *   │            (inerte até ativar)                           │
 *   │                                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * - Barra permite retornar pro descritivo sem depender do foco (o click
 *   funciona mesmo quando o foco está dentro do iframe, diferente de ESC).
 * - Skeleton overlay some quando `onLoad` do iframe dispara.
 * - Mobile (<900px): oculta o iframe e mostra fallback com "abrir em nova aba".
 *
 * Clique-para-ativar: o iframe começa inerte (`pointer-events: none` via CSS,
 * na ausência de `.is-active`). Isso existe porque o documento embedado tem
 * `overscroll-behavior: none` e nenhum scroller interno — com o iframe vivo, a
 * roda do mouse sobre ele não rola nada e também não repassa o evento pro deck,
 * o que fazia a apresentação parecer travada. Inerte, o scroll atravessa.
 *
 * O caminho da apresentação não ganha clique extra: o CTA "▷ Explorar" do slide
 * descritivo dispara `nuki-demo:activate` e a demo já chega ativa.
 *
 * Saídas: ESC (window, só enquanto ativo), ESC de dentro do iframe (o
 * DeckBehaviors reemite o postMessage `nuki-demo:esc` como `nuki-demo:exit`),
 * os botões da barra, ou sair de vista.
 */
export function ModuleDemoSlide({ data }: { data: ModuleData }) {
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const demoId = data.demoUrl ? `${data.id}-demo` : null;
  const backTargetId = data.id;

  /** Sair da demo: desativa e volta pro slide descritivo do módulo. */
  const exitToDescriptive = useCallback(() => {
    setActive(false);
    document.getElementById(backTargetId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, [backTargetId]);

  /** Ativa via CTA do slide descritivo. */
  useEffect(() => {
    if (!demoId) return;
    const onActivate = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === demoId) setActive(true);
    };
    window.addEventListener("nuki-demo:activate", onActivate);
    return () => window.removeEventListener("nuki-demo:activate", onActivate);
  }, [demoId]);

  /** Saídas por teclado, registradas só enquanto a demo está ativa — assim ESC
      não rouba a tecla do resto do deck e `nuki-demo:exit` (ESC de dentro do
      iframe, reemitido pelo DeckBehaviors) só age na demo que está em uso. */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      exitToDescriptive();
    };
    const onExit = () => exitToDescriptive();
    window.addEventListener("keydown", onKey);
    window.addEventListener("nuki-demo:exit", onExit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nuki-demo:exit", onExit);
    };
  }, [active, exitToDescriptive]);

  /** Sair de vista desativa, pra demo não voltar quente na próxima passagem. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) setActive(false);
        });
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!data.demoUrl || !demoId) return null;

  /** Navega entre os slides walkable a partir do demo. dir = -1 volta pro
      descritivo do mesmo módulo, dir = 1 vai pro próximo módulo (ou seção)
      na ordem em que aparecem no DOM. Reusa a mesma lista que o
      DeckBehaviors monta pra setas globais — nada de props/ref. */
  const navigate = (dir: -1 | 1) => {
    if (typeof document === "undefined") return;
    setActive(false);
    const walkable = Array.from(
      document.querySelectorAll<HTMLElement>(".slide, .module"),
    ).filter((el) => el.id);
    const currentIdx = walkable.findIndex((el) => el.id === demoId);
    if (currentIdx === -1) return;
    const target = walkable[currentIdx + dir];
    if (target)
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
  };

  return (
    <section
      ref={sectionRef}
      className={`slide is-fullscreen module-demo-slide${active ? " is-active" : ""}`}
      id={demoId}
      /* Mantém o ponto do módulo aceso no progress nav: `inspetor-demo` não
         existe no deckNav, e sem isso o nav apaga inteiro nesta seção. */
      data-nav-id={data.id}
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

        {!active && (
          <button
            type="button"
            className="module-demo-activate"
            onClick={() => setActive(true)}
            aria-label={`Ativar a demo interativa do ${data.title.strong}`}
          >
            <span className="module-demo-activate-pill">
              <span aria-hidden="true">▷</span> Clique para interagir
            </span>
          </button>
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

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
