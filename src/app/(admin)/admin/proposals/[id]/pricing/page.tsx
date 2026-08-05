import { ImagePricesForm } from "@/components/admin/ImagePricesForm";
import { PricingEditor } from "@/components/admin/PricingEditor";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

export const dynamic = "force-dynamic";

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const { resolved, snapshotStale } = await loadProposalConfig(id);
  const { plans, billingCycles, maxMonths, imagePrices } = resolved.estimate;

  /* O editor é dono da aba inteira — formulário à esquerda, simulador ao vivo à
     direita — porque o painel da direita lê o estado do formulário, e estado de
     cliente não volta para um Server Component. As tarifas de imagem são outra
     action e entram como slot na mesma coluna. */
  return (
    <PricingEditor
      id={id}
      initialPlans={plans.map((plan) => ({
        n: plan.n,
        items: [...plan.items],
        monthlyPrice: plan.monthlyPrice,
        featured: Boolean(plan.featured),
      }))}
      /* Fraction to percent happens here and back again in the action —
         the stored unit never leaks into the form. */
      initialCycles={billingCycles.map((cycle) => ({
        id: cycle.id,
        label: cycle.label,
        discountPercent: Math.round(cycle.discount * 100),
        minMonths: cycle.minMonths,
      }))}
      initialMaxMonths={maxMonths}
      snapshotStale={snapshotStale}
      previewHref={`/preview/${id}#pricing`}
    >
      <ImagePricesForm id={id} base={imagePrices.base} option={imagePrices.option} />
    </PricingEditor>
  );
}
