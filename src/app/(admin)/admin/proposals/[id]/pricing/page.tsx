import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { ImagePricesForm } from "@/components/admin/ImagePricesForm";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

export const dynamic = "force-dynamic";

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const { resolved, snapshotStale } = await loadProposalConfig(id);
  const { imagePrices } = resolved.estimate;

  /* Mesma coluna de ajustes da Visão geral: seções sem caixa, separadas por um
     fio, e a primeira sem ele. `first-of-type` e não `first-child` porque o
     aviso de alterações não publicadas entra antes dela. */
  return (
    <div className="flex min-w-0 flex-col gap-8 animate-fade [&>section:first-of-type]:border-t-0 [&>section:first-of-type]:pt-0">
      {snapshotStale && <UnpublishedChangesBanner id={id} />}

      <ImagePricesForm id={id} base={imagePrices.base} option={imagePrices.option} />
    </div>
  );
}
