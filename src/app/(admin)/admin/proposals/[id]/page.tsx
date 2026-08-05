import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AttentionTable } from "@/components/admin/AttentionTable";
import {
  CopyLinkButton,
  DetailsForm,
  PasswordForm,
  PublishForm,
} from "@/components/admin/ProposalDetailForms";
import { Alert } from "@/components/admin/ui/Alert";
import { Card, CardContent, CardHeader } from "@/components/admin/ui/Card";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { getProposal, listProposals } from "@/server/proposals/admin";
import { loadProposalConfig } from "@/server/proposals/config";
import { proposalAttention } from "@/server/tracking/readout";

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
  const config = await loadProposalConfig(id);
  /* Labels come from the proposal's own resolved config, so a renamed or
     reordered slide reads correctly — and an anchor the config no longer has
     still shows, by its raw id. */
  const attention = await proposalAttention(id, config.resolved.slides);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${protocol}://${host}/p/${proposal.slug}`;

  const isDraft = proposal.status !== "published";
  const hasPassword = Boolean(summary?.hasPassword);

  return (
    /* Coluna de leitura — ver a nota na aba de planos e preços. */
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader
          title="Link do cliente"
          description="O endereço que vai por WhatsApp ou e-mail. Só abre com a senha desta proposta."
        />
        <CardContent className="flex flex-col gap-3">
          <CopyLinkButton url={publicUrl} />

          {/* Os dois motivos pelos quais um link recém-copiado não abre, ditos
              antes de o vendedor mandar — e não depois de o cliente reclamar. */}
          {isDraft && (
            <Alert tone="warning" title="Este link ainda não abre">
              A proposta é um rascunho. Publique na seção abaixo.
            </Alert>
          )}
          {!hasPassword && (
            <Alert tone="warning" title="Sem senha definida">
              Ninguém consegue entrar até você definir uma.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Dados" description="Título exibido no painel e prazo de validade." />
        <DetailsForm
          id={proposal.id}
          title={proposal.title}
          expiresAt={toDateInput(proposal.expires_at)}
        />
      </Card>

      <Card>
        <CardHeader title="Senha" description="Verificada no servidor, a cada abertura do link." />
        <PasswordForm id={proposal.id} hasPassword={hasPassword} />
      </Card>

      <Card>
        <CardHeader
          title="Atenção do cliente"
          description="Quanto tempo cada slide segurou a leitura. Suas próprias aberturas não entram na conta."
        />
        <CardContent>
          <AttentionTable attention={attention} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Publicação"
          description="Publicar congela o deck de hoje nesta proposta."
        />
        <PublishForm
          id={proposal.id}
          published={proposal.status === "published"}
          snapshotStale={config.snapshotStale}
          publishedAt={proposal.published_at}
        />
      </Card>
    </div>
  );
}
