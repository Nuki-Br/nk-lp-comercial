import Link from "next/link";
import { signOutAction } from "@/app/(admin)/admin/login/actions";
import { CreateProposalDialog } from "@/components/admin/CreateProposalDialog";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { listProposals } from "@/server/proposals/admin";

/* Session-bound and never cacheable. */
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};

/* A date, in pt-BR, from Intl — no date library (Rule 3). */
const formatDate = (iso: string | null): string =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso)) : "—";

export default async function AdminPage() {
  /* At the top of the PAGE, not once in the layout. Layout-only gating is a
     known hole — ADR 15. */
  const admin = await requireAdmin();
  const proposals = await listProposals();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-nuki-gray-7">
            Painel comercial
          </p>
          <h1 className="mt-1 text-2xl font-bold text-nuki-green-03">Propostas</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-nuki-gray-mid">{admin.email}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm font-semibold text-nuki-gray-mid underline hover:text-nuki-black"
            >
              Sair
            </button>
          </form>
          <CreateProposalDialog />
        </div>
      </header>

      {proposals.length === 0 ? (
        <p className="rounded-2xl border border-nuki-gray-border bg-nuki-white p-8 text-center text-nuki-gray-mid">
          Nenhuma proposta ainda. Crie a primeira em “Nova proposta”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-nuki-gray-border bg-nuki-white">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="border-b border-nuki-gray-divider text-xs uppercase tracking-wide text-nuki-gray-7">
              <tr>
                <th className="p-4 font-semibold">Construtora</th>
                <th className="p-4 font-semibold">Proposta</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Senha</th>
                <th className="p-4 font-semibold">Expira</th>
                <th className="p-4 text-right font-semibold">Aberturas</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-nuki-gray-divider last:border-0">
                  <td className="p-4 font-semibold">{proposal.clientName}</td>
                  <td className="p-4">
                    <Link
                      href={`/admin/proposals/${proposal.id}`}
                      className="text-nuki-green-02 underline"
                    >
                      {proposal.title}
                    </Link>
                  </td>
                  <td className="p-4">{STATUS_LABEL[proposal.status] ?? proposal.status}</td>
                  <td className="p-4">{proposal.hasPassword ? "Definida" : "—"}</td>
                  <td className="p-4">{formatDate(proposal.expiresAt)}</td>
                  <td className="p-4 text-right tabular-nums">{proposal.openCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
