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
  const { defaults, projectSizePresets, roomPresets, customRoomDefaults, imagePrices } =
    resolved.estimate;

  /* Every shipped preset, not this proposal's surviving subset — otherwise
     unticking one would remove it from the form and there would be no way to
     put it back. The resolved list only decides which boxes start ticked. */
  const allPresets = buildDefaultDeck().estimate.projectSizePresets;

  /* O editor é dono das duas colunas, porque o painel ao vivo à direita lê o
     estado do formulário. */
  return (
    <EstimateEditor
      id={id}
      initialDryOptions={defaults.dryOptions}
      initialWetOptions={defaults.wetOptions}
      initialUnitTypes={defaults.unitTypes}
      initialKeptPresetIds={projectSizePresets.map((preset) => preset.id)}
      presets={[...allPresets]}
      roomPresets={[...roomPresets]}
      customRoomDefaults={customRoomDefaults}
      /* Só leitura: quem edita as tarifas é a aba de tarifas de imagem. Aqui
         elas são o que transforma imagens em reais no painel ao vivo. */
      imagePrices={imagePrices}
      snapshotStale={snapshotStale}
      previewHref={`/preview/${id}#calculator`}
    />
  );
}
