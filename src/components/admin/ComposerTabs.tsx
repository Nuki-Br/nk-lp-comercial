"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function ComposerTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/proposals/${id}`;

  /* A "Visão geral" é o segmento vazio, então ela casaria com tudo. Procura-se
     primeiro um segmento de verdade; o resto é a visão geral. */
  const active =
    TABS.find((tab) => tab.segment && pathname.startsWith(`${base}${tab.segment}`))?.key ??
    "overview";

  return (
    /* A régua é da `<nav>` inteira, e a aba ativa a cobre com um `-mb-px`. É o
       que faz o sublinhado parecer parte da régua em vez de flutuar sobre ela —
       e é por isso que a régua não pode virar um `border-b` por link. */
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`${base}${tab.segment}`}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25",
            tab.key === active
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
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
