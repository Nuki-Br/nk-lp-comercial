import Link from "next/link";

/* The composer is four routes rather than one page with six forms. Each one is
   reviewable on its own, each calls requireAdmin() at its own top, and a
   salesperson opening "Slides" does not load the estimator editor.

   Sub-routes under /admin/**, not a fifth surface — AGENTS.md Rule 4's route
   table still describes this app exactly. */

export type ComposerTab = "overview" | "slides" | "pricing" | "estimate";

const TABS: { key: ComposerTab; label: string; segment: string }[] = [
  { key: "overview", label: "Visão geral", segment: "" },
  { key: "slides", label: "Slides", segment: "/slides" },
  { key: "pricing", label: "Planos e preços", segment: "/pricing" },
  { key: "estimate", label: "Calculadora", segment: "/estimate" },
];

export function ComposerTabs({ id, active }: { id: string; active: ComposerTab }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-nuki-gray-divider">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/proposals/${id}${tab.segment}`}
          aria-current={tab.key === active ? "page" : undefined}
          className={
            tab.key === active
              ? "-mb-px border-b-2 border-nuki-green-02 px-4 py-2.5 text-sm font-semibold text-nuki-green-03"
              : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-nuki-gray-mid hover:text-nuki-black"
          }
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
    <p className="rounded-xl border border-nuki-orange bg-nuki-gray-light p-4 text-sm text-nuki-black">
      Esta proposta está publicada e tem alterações que o cliente ainda não vê. O link continua
      mostrando a versão congelada até você{" "}
      <Link href={`/admin/proposals/${id}`} className="font-semibold underline">
        republicar
      </Link>
      .
    </p>
  );
}
