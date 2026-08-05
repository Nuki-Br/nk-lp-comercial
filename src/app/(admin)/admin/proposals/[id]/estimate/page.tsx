import { ComposerTabs, UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { EstimateEditor } from "@/components/admin/EstimateEditor";
import { buildDefaultDeck } from "@/deck/defaults";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

export const dynamic = "force-dynamic";

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const { resolved, snapshotStale } = await loadProposalConfig(id);
  const { defaults, projectSizePresets, roomPresets, customRoomDefaults } = resolved.estimate;

  /* Every shipped preset, not this proposal's surviving subset — otherwise
     unticking one would remove it from the form and there would be no way to
     put it back. The resolved list only decides which boxes start ticked. */
  const allPresets = buildDefaultDeck().estimate.projectSizePresets;

  return (
    <>
      <ComposerTabs id={id} active="estimate" />
      {snapshotStale && <UnpublishedChangesBanner id={id} />}

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Como a calculadora abre
        </h2>
        <p className="mt-2 mb-5 text-sm text-nuki-gray-mid">
          O cliente ainda pode mexer em tudo durante a apresentação. Isto é o ponto de partida — se
          o empreendimento dele já estiver modelado aqui, a conversa começa no número certo.
        </p>

        <EstimateEditor
          id={id}
          initialDryOptions={defaults.dryOptions}
          initialWetOptions={defaults.wetOptions}
          initialUnitTypes={defaults.unitTypes}
          initialKeptPresetIds={projectSizePresets.map((preset) => preset.id)}
          presets={[...allPresets]}
          roomPresets={[...roomPresets]}
          customRoomDefaults={customRoomDefaults}
        />
      </section>
    </>
  );
}
