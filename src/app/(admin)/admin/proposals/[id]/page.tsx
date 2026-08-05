import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CopyLinkButton,
  DetailsForm,
  PasswordForm,
  PublishForm,
} from "@/components/admin/ProposalDetailForms";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { getProposal, listProposals } from "@/server/proposals/admin";

export const dynamic = "force-dynamic";

/** The stored timestamp back to what <input type="date"> wants. */
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. */
  await requireAdmin();

  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  /* `hasPassword` comes from the list query, which already computes it. One more
     round trip for one boolean is not worth a second code path. */
  const summary = (await listProposals()).find((p) => p.id === id);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${protocol}://${host}/p/${proposal.slug}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div>
        <Link href="/admin" className="text-sm text-nuki-gray-mid underline hover:text-nuki-black">
          ← Propostas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-nuki-green-03">{proposal.title}</h1>
        <p className="text-sm text-nuki-gray-mid">{proposal.clients?.name}</p>
      </div>

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Link do cliente
        </h2>
        <CopyLinkButton url={publicUrl} />
        {proposal.status !== "published" && (
          <p className="mt-3 text-sm text-nuki-orange">
            Este link ainda não abre: a proposta é um rascunho.
          </p>
        )}
        {!summary?.hasPassword && (
          <p className="mt-1 text-sm text-nuki-orange">
            Sem senha definida, ninguém consegue entrar.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Dados
        </h2>
        <DetailsForm
          id={proposal.id}
          title={proposal.title}
          expiresAt={toDateInput(proposal.expires_at)}
        />
      </section>

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Senha
        </h2>
        <PasswordForm id={proposal.id} hasPassword={Boolean(summary?.hasPassword)} />
      </section>

      <section className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-nuki-gray-7">
          Publicação
        </h2>
        <PublishForm id={proposal.id} published={proposal.status === "published"} />
      </section>
    </main>
  );
}
