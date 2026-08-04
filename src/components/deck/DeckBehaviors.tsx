"use client";

import { useEffect } from "react";

/**
 * Scripts da apresentação /comercial.
 *
 * Cobre:
 * 1. Reveal/stagger — igual ao JourneyScripts, observa [data-reveal-group].
 * 2. Progress nav lateral — observa .slide e .module. Uma seção pode emprestar
 *    o ponto de outra via [data-nav-id] (é como o slide de demo mantém o ponto
 *    do módulo aceso, já que ele não existe no deckNav).
 * 3. Navegação por teclado — ←/PageUp/Shift+Espaço volta, →/PageDown/Espaço avança.
 *    Deriva a lista walkable do DOM, não do deckNav.
 * 4. Bridge do ESC vindo de dentro do iframe da demo: reemite o postMessage
 *    `nuki-demo:esc` como o evento de janela `nuki-demo:exit`.
 * 5. Sticky-device (troca de tela nos módulos) — mesmo padrão do JourneyScripts.
 * 6. Parallax do bgnum — fallback quando não há animation-timeline nativo.
 * 7. Dica flutuante das setas — aparece por 4s no load.
 *
 * O antigo scroll lock da demo (`html.demo-locked`) saiu: ele congelava a
 * apresentação num offset arbitrário. O encaixe agora é `scroll-snap` no CSS, e
 * a ativação da demo é do ModuleDemoSlide.
 */
export function DeckBehaviors() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    if (!reduce) html.style.scrollBehavior = "smooth";
    cleanups.push(() => {
      html.style.scrollBehavior = prevScrollBehavior;
    });

    // 1) Reveal com stagger.
    const timeouts: number[] = [];
    const revIO = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const items = e.target.querySelectorAll<HTMLElement>(".reveal");
          items.forEach((el, i) => {
            const t = window.setTimeout(() => el.classList.add("is-visible"), reduce ? 0 : i * 90);
            timeouts.push(t);
          });
          revIO.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    document.querySelectorAll("[data-reveal-group]").forEach((g) => revIO.observe(g));
    cleanups.push(() => {
      revIO.disconnect();
      timeouts.forEach((t) => clearTimeout(t));
    });

    // 2) Progress nav — .cm-section (seções da apresentação) + .module (Modulos reusa JourneyModule).
    //    Reflete o tom do fundo da seção ativa no .progress via data-tone, pra
    //    paleta escura/clara do próprio nav responder ao contexto sem piscar.
    const progressEl = document.querySelector<HTMLElement>(".progress-nav");
    const navIO = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const section = e.target as HTMLElement;
          // `data-nav-id` deixa uma seção emprestar o ponto de outra. O slide de
          // demo (`inspetor-demo`) não existe no deckNav, e sem isso o nav
          // apagaria inteiro enquanto ele estivesse na tela.
          const id = section.dataset.navId || section.id;
          document.querySelectorAll(".progress-nav a").forEach((a) => {
            a.classList.toggle("is-active", (a as HTMLElement).dataset.sectionId === id);
          });
          const tone = section.dataset.tone === "dark" ? "dark" : "light";
          progressEl?.setAttribute("data-tone", tone);
        });
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    document.querySelectorAll(".slide, .module").forEach((s) => navIO.observe(s));
    cleanups.push(() => navIO.disconnect());

    // 3) Navegação por teclado — deriva a lista walkable do DOM em runtime
    // (todos os `.cm-section` com id, na ordem em que aparecem). Isso permite
    // que seções como `#planner-demo` (que NÃO existem em comercialNav) sejam
    // navegáveis por seta ← → mas continuem invisíveis no progress-nav lateral.
    // comercialNav segue sendo a fonte da verdade só do progress-nav.
    const getWalkableIds = (): string[] => {
      const nodes = document.querySelectorAll<HTMLElement>(".slide, .module");
      const ids: string[] = [];
      nodes.forEach((el) => {
        if (el.id) ids.push(el.id);
      });
      return ids;
    };
    const currentPartIndex = (partIds: string[]) => {
      const mid = window.innerHeight / 2;
      let closest = 0;
      let closestDist = Infinity;
      partIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - mid);
        if (d < closestDist) {
          closestDist = d;
          closest = i;
        }
      });
      return closest;
    };
    const goToPart = (i: number, partIds: string[]) => {
      const clamped = Math.max(0, Math.min(partIds.length - 1, i));
      const el = document.getElementById(partIds[clamped]);
      if (!el) return;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    // Bridge de ESC vindo de DENTRO do iframe da demo. O HTML injeta um keydown
    // listener com { capture: true } que faz postMessage({type:'nuki-demo:esc'})
    // pro parent. Isso resolve o "ESC não funciona quando foco está no iframe"
    // sem precisar de auto-scroll pro parent ou tricks de blur.
    //
    // O tipo `nuki-demo:esc` está assado no HTML committado — não renomear.
    // Aqui ele só é reemitido como evento de janela; quem decide o que fazer é
    // o ModuleDemoSlide, que é dono do estado de ativação.
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "nuki-demo:esc") {
        window.dispatchEvent(new CustomEvent("nuki-demo:exit"));
      }
    };
    window.addEventListener("message", onMessage);
    cleanups.push(() => window.removeEventListener("message", onMessage));

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // ESC é do ModuleDemoSlide (só enquanto a demo está ativa) — aqui não se
      // mexe. Setas seguem navegando o deck inteiro, inclusive sobre a demo.
      const partIds = getWalkableIds();
      const cur = currentPartIndex(partIds);
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        goToPart(cur + 1, partIds);
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        (e.key === " " && e.shiftKey)
      ) {
        e.preventDefault();
        goToPart(cur - 1, partIds);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToPart(0, partIds);
      } else if (e.key === "End") {
        e.preventDefault();
        goToPart(partIds.length - 1, partIds);
      }
    };
    window.addEventListener("keydown", onKey);
    cleanups.push(() => window.removeEventListener("keydown", onKey));

    // 4) Sticky device (Planner/Personaliza/Inspetor) — troca a tela ativa por passo.
    document.querySelectorAll<HTMLElement>(".device-grid").forEach((grid) => {
      const stepEls = grid.querySelectorAll<HTMLElement>(".device-step");
      if (!stepEls.length) return;
      const screens = grid.querySelectorAll<HTMLElement>(".device-screen");
      const stepIO = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const idx = (e.target as HTMLElement).dataset.step;
            screens.forEach((s) => s.classList.toggle("is-visible", s.dataset.screen === idx));
          });
        },
        { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
      );
      stepEls.forEach((s) => stepIO.observe(s));
      cleanups.push(() => stepIO.disconnect());
    });

    // 5) Parallax do bgnum (fallback).
    const nativeTimeline = !!(
      window.CSS &&
      CSS.supports &&
      CSS.supports("animation-timeline", "view()")
    );
    if (!reduce && !nativeTimeline) {
      const px = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const vh = window.innerHeight;
          px.forEach((el) => {
            const r = el.getBoundingClientRect();
            const center = r.top + r.height / 2;
            const off = (center - vh / 2) / vh;
            el.style.transform = `translateY(${off * parseFloat(el.dataset.parallax || "0")}px)`;
          });
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }

    // 6) Dica flutuante ← →. Aparece 800ms após o load, some após 4s.
    const hint = document.querySelector<HTMLElement>(".keyboard-hint");
    if (hint && !reduce) {
      const t1 = window.setTimeout(() => hint.classList.add("is-visible"), 800);
      const t2 = window.setTimeout(() => hint.classList.remove("is-visible"), 5000);
      cleanups.push(() => {
        clearTimeout(t1);
        clearTimeout(t2);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
