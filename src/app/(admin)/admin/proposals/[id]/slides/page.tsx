import type { PickerRow } from "@/components/admin/SlidePicker";
import { SlidesWorkspace } from "@/components/admin/SlidesWorkspace";
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

/** A única aba que ocupa a largura toda: o rail sozinho é uma coluna estreita,
    e a prévia ao lado dele é o que transforma "desmarcar uma linha" em "ver o
    que o cliente deixa de ver". */
export default async function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time — not once in the layout. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const config = await loadProposalConfig(id);

  return (
    <SlidesWorkspace
      id={id}
      initialRows={toRows(config.resolved.slides)}
      previewSrc={`/preview/${id}`}
      snapshotStale={config.snapshotStale}
    />
  );
}
