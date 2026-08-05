"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/admin/ui/Alert";
import { cn } from "@/lib/cn";

/* The composer is four routes rather than one page with six forms. Each one is
   reviewable on its own, each calls requireAdmin() at its own top, and a
   salesperson opening "Slides" does not load the estimator editor.

   Sub-routes under /admin/**, not a fifth surface — AGENTS.md Rule 4's route
   table still describes this app exactly.

   A ABA ATIVA VEM DO PATHNAME, não de uma prop. A régua subiu para o layout do
   compositor, que é comum às quatro rotas e não sabe qual delas está montada;
   e o efeito colateral é o que interessa numa tela que se atravessa o dia
   inteiro: o sublinhado troca no clique, junto com o resto da navegação, em vez
   de esperar a página do outro lado responder. */

const TABS: { key: string; label: string; segment: string }[] = [
  { key: "overview", label: "Visão geral", segment: "" },
  { key: "slides", label: "Slides", segment: "/slides" },
  { key: "pricing", label: "Planos e preços", segment: "/pricing" },
  { key: "estimate", label: "Calculadora", segment: "/estimate" },
];

/* O SUBLINHADO É UM ELEMENTO SÓ, QUE ANDA.
 *
 * Quatro `border-bottom` acendendo e apagando dizem qual aba está ativa; um
 * traço que desliza da aba antiga para a nova diz de ONDE se veio, que é a
 * informação que falta numa tela em que se troca de aba dezenas de vezes por
 * proposta. A trilha é a mesma da navegação: o traço parte no clique, junto com
 * o `pathname`, e não quando a página do outro lado responde.
 *
 * Medido com `offsetLeft`/`offsetWidth`, em `useEffect` e não em
 * `useLayoutEffect`: o segundo avisa no console a cada render de servidor, e o
 * que se ganharia com ele é um frame. Esse frame tem cobertura própria — até a
 * primeira medida a aba ativa carrega uma borda estática, e ela some no mesmo
 * commit em que o traço aparece. Assim a régua nunca fica sem indicador, nem em
 * um navegador que decida não hidratar.
 *
 * `bounds === null` também é o que impede a animação de entrada: o traço só é
 * montado depois de medido, e um elemento que nasce na posição certa não tem de
 * onde transicionar. Só as trocas seguintes deslizam. */
type Bounds = { left: number; width: number };

export function ComposerTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/proposals/${id}`;

  /* A "Visão geral" é o segmento vazio, então ela casaria com tudo. Procura-se
     primeiro um segmento de verdade; o resto é a visão geral. */
  const active =
    TABS.find((tab) => tab.segment && pathname.startsWith(`${base}${tab.segment}`))?.key ??
    "overview";

  const nav = useRef<HTMLElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  /* Uma medida por aba ativa — é a troca de aba que move o traço. A busca é por
     `data-tab`, e não por `[aria-current="page"]`, porque assim o efeito depende
     de `active` de verdade em vez de listá-lo como gatilho: o mesmo valor que
     dispara a remedição é o que escolhe o que medir. */
  useEffect(() => {
    const element = nav.current;
    if (!element) return;

    const measure = () => {
      const current = element.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      if (current) setBounds({ left: current.offsetLeft, width: current.offsetWidth });
    };

    /* `observe` dispara uma vez de imediato, então isto também é a medida
        inicial. O resto é a régua encolhendo com a janela: sem ela, o traço fica
        onde a aba estava antes do redimensionamento. */
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);

  return (
    /* A régua é da `<nav>` inteira, e o traço a cobre com um `-mb-px`. É o que
       faz o sublinhado parecer parte da régua em vez de flutuar sobre ela — e é
       por isso que a régua não pode virar um `border-b` por link. */
    /* A barra de rolagem da régua fica ESCONDIDA. Numa tela estreita as quatro
       abas transbordam, e um navegador com barra clássica desenha o trilho
       exatamente onde o traço da aba ativa vive — dois fios cinza empilhados no
       mesmo lugar, um deles fingindo ser o indicador. As abas continuam
       roláveis por toque, por trackpad e por teclado; o que sai é o desenho. */
    <nav
      ref={nav}
      className="relative -mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`${base}${tab.segment}`}
          data-tab={tab.key}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none",
            "transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/25",
            tab.key === active
              ? cn("text-foreground", bounds ? "border-transparent" : "border-foreground")
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <TabLabel>{tab.label}</TabLabel>
        </Link>
      ))}

      {bounds && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-foreground transition-[translate,width] duration-300 ease-out-quart"
          style={{ width: bounds.width, translate: `${bounds.left}px 0` }}
        />
      )}
    </nav>
  );
}

/** O rótulo da aba, com o ponto que diz que ela está carregando.
 *
 * As quatro rotas são `force-dynamic` e não têm `loading.tsx`, então o clique
 * fica esperando o servidor com a tela anterior ainda montada — e sem nenhuma
 * pista de que algo está acontecendo, numa proposta pesada isso lê como um
 * clique perdido. `useLinkStatus` é exatamente o caso que a documentação do Next
 * descreve para isto, e ele SÓ funciona dentro do `<Link>`; daí este componente
 * existir em vez de um `{tab.label}` solto.
 *
 * O ponto está sempre montado e só troca de opacidade — a mesma recomendação da
 * documentação. Um ponto que aparece do nada empurraria o rótulo, e a régua
 * inteira mediria diferente no meio da navegação, com o traço deslizante
 * perseguindo uma largura que muda. */
function TabLabel({ children }: { children: string }) {
  const { pending } = useLinkStatus();

  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "size-1 rounded-full bg-current transition-opacity duration-200",
          pending ? "animate-pulse opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}

/** Shown on every composer tab of a published proposal whose stored delta no
    longer matches the frozen snapshot. The freeze is the point of publishing
    (ADR 13), so the fact that edits are NOT live has to be visible where the
    edits are made — not only on the publish form. */
export function UnpublishedChangesBanner({ id }: { id: string }) {
  return (
    <Alert tone="warning" title="Alterações não publicadas">
      O cliente continua vendo a versão congelada até você{" "}
      <Link
        href={`/admin/proposals/${id}`}
        className="font-medium text-foreground underline underline-offset-4"
      >
        republicar
      </Link>
      .
    </Alert>
  );
}
