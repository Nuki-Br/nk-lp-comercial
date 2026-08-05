import { ComposerTabs, UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { type PickerRow, SlidePicker } from "@/components/admin/SlidePicker";
import { slideMetaOf } from "@/deck/meta";
import type { SlideNode } from "@/deck/types";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

export const dynamic = "force-dynamic";

/** Rows for the picker: one per top-level node, with its child folded in as a
    checkbox. Nothing here reads `kind` — `parentId` says what is a child and
    SLIDE_META says how to label it. */
function toRows(slides: SlideNode[]): PickerRow[] {
  const childrenOf = new Map<string, SlideNode>();
  for (const node of slides) {
    if (node.parentId && !childrenOf.has(node.parentId)) childrenOf.set(node.parentId, node);
  }

  return slides
    .filter((node) => !node.parentId)
    .map((node) => {
      const child = childrenOf.get(node.id);
      return {
        id: node.id,
        label: node.label,
        description: slideMetaOf(node.kind).description,
        enabled: node.enabled,
        ...(child ? { demo: { id: child.id, enabled: child.enabled } } : {}),
      };
    });
}

export default async function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time — not once in the layout. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const config = await loadProposalConfig(id);

  return (
    <>
      <ComposerTabs id={id} active="slides" />
      {config.snapshotStale && <UnpublishedChangesBanner id={id} />}

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Slides desta proposta
        </h2>
        <p className="mt-2 mb-5 text-sm text-nuki-gray-mid">
          Desmarque o que não vai nesta apresentação e use as setas para reordenar. A numeração dos
          módulos e os pontinhos de navegação se ajustam sozinhos.
        </p>

        <SlidePicker id={id} initialRows={toRows(config.resolved.slides)} />
      </section>
    </>
  );
}
