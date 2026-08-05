"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDeckNavigation } from "@/components/deck/DeckNavigation";
import type { ModuleDemoNode } from "@/deck/types";
import { fill } from "@/lib/format";

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
export function ModuleDemoSlide({ node }: { node: ModuleDemoNode }) {
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  // Hook antes de qualquer early return — regras dos hooks.
  const { getWalkableIds } = useDeckNavigation();

  const { labels, moduleName } = node;
  const demoId = node.id;
  /* O pai é quem `normalizeDeck` amarrou via `parentId`; o fallback nunca
     dispara num config normalizado, mas evita um `undefined` no scroll. */
  const backTargetId = node.parentId ?? node.id;

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

  /** Navega entre os slides walkable a partir da demo. dir = -1 volta pro
      descritivo do mesmo módulo, dir = 1 vai pra próxima seção.

      Consome a MESMA lista que o `DeckBehaviors` usa pras setas globais, vinda
      do config. Antes esta função remontava a query do DOM à mão, então dois
      lugares codificavam "o que é navegável" e iam divergir. */
  const navigate = (dir: -1 | 1) => {
    if (typeof document === "undefined") return;
    setActive(false);
    const ids = getWalkableIds();
    const currentIdx = ids.indexOf(demoId);
    if (currentIdx === -1) return;
    const targetId = ids[currentIdx + dir];
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section
      ref={sectionRef}
      className={`slide is-fullscreen module-demo-slide${active ? " is-active" : ""}`}
      id={demoId}
      /* Mantém o ponto do módulo aceso no progress nav: a demo não tem ponto
         próprio, e sem isso o nav apaga inteiro nesta seção. `navId` é derivado
         por `normalizeDeck`, então não dá pra apontar pra um ponto que sumiu. */
      data-nav-id={node.navId ?? backTargetId}
    >
      <header className="module-demo-bar">
        <button
          type="button"
          className="module-demo-bar-nav"
          onClick={() => navigate(-1)}
          aria-label={fill(labels.backAriaTemplate, { strong: moduleName })}
          title={labels.backTitle}
        >
          <span aria-hidden="true">{labels.backGlyph}</span> {labels.back}
        </button>

        <span className="module-demo-bar-title">
          <strong>{moduleName}</strong>
          <span className="module-demo-bar-sep">{labels.separator}</span>
          <span className="module-demo-bar-suffix">{labels.badge}</span>
        </span>

        <button
          type="button"
          className="module-demo-bar-nav"
          onClick={() => navigate(1)}
          aria-label={labels.forwardAria}
          title={labels.forwardTitle}
        >
          {labels.forward} <span aria-hidden="true">{labels.forwardGlyph}</span>
        </button>
      </header>

      <div className="module-demo-stage">
        {/* Iframe full width/height; onLoad esconde o skeleton */}
        <iframe
          className="module-demo-frame"
          src={node.demoUrl}
          title={fill(labels.iframeTitleTemplate, { strong: moduleName })}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />

        {!loaded && (
          <div className="module-demo-skeleton" aria-hidden="true">
            <div className="module-demo-skeleton-pulse" />
            <p className="module-demo-skeleton-text">{labels.loading}</p>
          </div>
        )}

        {!active && (
          <button
            type="button"
            className="module-demo-activate"
            onClick={() => setActive(true)}
            aria-label={fill(labels.activateAriaTemplate, { strong: moduleName })}
          >
            <span className="module-demo-activate-pill">
              <span aria-hidden="true">{labels.activateGlyph}</span> {labels.activateHint}
            </span>
          </button>
        )}

        {/* Mobile fallback — CSS controla a visibilidade */}
        <div className="module-demo-mobile" role="note">
          <p className="module-demo-mobile-title">{labels.mobileTitle}</p>
          <p className="module-demo-mobile-body">
            {fill(labels.mobileBodyTemplate, { strong: moduleName })}
          </p>
          <a
            className="module-demo-mobile-link"
            href={node.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {labels.mobileCta}
          </a>
        </div>
      </div>
    </section>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
