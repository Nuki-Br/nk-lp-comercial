import { ComposerTabs, UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
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

  return (
    <>
      <ComposerTabs id={id} active="pricing" />
      {snapshotStale && <UnpublishedChangesBanner id={id} />}

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Planos e ciclos
        </h2>
        <p className="mt-2 mb-5 text-sm text-nuki-gray-mid">
          O que o cliente vê no slide de planos e no simulador de meses.
        </p>

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
      </section>

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Tarifas de imagem
        </h2>
        <p className="mt-2 mb-5 text-sm text-nuki-gray-mid">
          A base de custo por trás da calculadora desta proposta.
        </p>

        <ImagePricesForm id={id} base={imagePrices.base} option={imagePrices.option} />
      </section>
    </>
  );
}
