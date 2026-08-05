import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { ImagePricesForm } from "@/components/admin/ImagePricesForm";
import { PricingEditor } from "@/components/admin/PricingEditor";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

export const dynamic = "force-dynamic";

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. ADR 15. */
  await requireAdmin();

  const { id } = await params;
  const { resolved, snapshotStale } = await loadProposalConfig(id);
  const { plans, billingCycles, maxMonths, imagePrices } = resolved.estimate;

  return (
    /* Coluna de leitura, não a largura toda: o compositor alargou por causa da
       aba Slides, e um formulário de 1280px é onde o olho perde a linha. */
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {snapshotStale && <UnpublishedChangesBanner id={id} />}

      <Card>
        <CardHeader
          title="Planos e ciclos"
          description="O que o cliente vê no slide de planos e no simulador de meses."
        />
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
        />
      </Card>

      <Card>
        <CardHeader
          title="Tarifas de imagem"
          description="A base de custo por trás da calculadora desta proposta."
        />
        <ImagePricesForm id={id} base={imagePrices.base} option={imagePrices.option} />
      </Card>
    </div>
  );
}
