import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { getProposal } from "@/server/proposals/admin";

/* The composer's shared frame: who the proposal is for, and the four tabs.
 *
 * `requireAdmin()` here is NOT the gate — every page below still calls it at its
 * own top, because layout-only gating is the hole ADR 15 names and a Server
 * Function is reachable without ever rendering its layout. This call exists so
 * the frame itself does not read a proposal for a signed-out visitor. */

export const dynamic = "force-dynamic";

export default async function ProposalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div>
        <Link href="/admin" className="text-sm text-nuki-gray-mid underline hover:text-nuki-black">
          ← Propostas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-nuki-green-03">{proposal.title}</h1>
        <p className="text-sm text-nuki-gray-mid">{proposal.clients?.name}</p>
      </div>

      {children}
    </main>
  );
}
