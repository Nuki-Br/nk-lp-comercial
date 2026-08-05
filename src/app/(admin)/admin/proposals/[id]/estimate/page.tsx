import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { EstimateEditor } from "@/components/admin/EstimateEditor";
import { Card, CardHeader } from "@/components/admin/ui/Card";
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
    /* Coluna de leitura — ver a nota na aba de planos e preços. */
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {snapshotStale && <UnpublishedChangesBanner id={id} />}

      <Card>
        <CardHeader
          title="Como a calculadora abre"
          description="O cliente ainda pode mexer em tudo durante a apresentação. Isto é o ponto de partida — se o empreendimento dele já estiver modelado aqui, a conversa começa no número certo."
        />
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
      </Card>
    </div>
  );
}
