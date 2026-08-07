import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AttentionTable } from "@/components/admin/AttentionTable";
import {
  DeleteProposalForm,
  DetailsForm,
  PasswordForm,
  ResetAttentionForm,
} from "@/components/admin/ProposalDetailForms";
import { type ChecklistItem, PublishPanel, type SendState } from "@/components/admin/PublishPanel";
import { Section } from "@/components/admin/ui/Section";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { getProposal, proposalSendReadiness } from "@/server/proposals/admin";
import { loadProposalConfig } from "@/server/proposals/config";
import { proposalAttention } from "@/server/tracking/readout";

export const dynamic = "force-dynamic";

/** The stored timestamp back to what <input type="date"> wants. */
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");

/* Datas formatadas AQUI, no servidor, e não no painel de envio.
 *
 * O painel é um componente de cliente, e um `Intl.DateTimeFormat` sem fuso lê o
 * fuso de quem executa — o servidor na primeira renderização, o navegador na
 * hidratação. Mesma string nos dois lados só por acaso.
 *
 * `expires_at` é o fim do dia escolhido em UTC (ver a action), então é em UTC
 * que ele volta a ser o dia que o vendedor digitou. `published_at` é um instante
 * de verdade, e quem o lê está em São Paulo. */
const formatDay = (iso: string): string =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(iso));

const formatMoment = (iso: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  /* Top of the page, every time. */
  await requireAdmin();

  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const { hasPassword, expired } = await proposalSendReadiness(id, proposal.expires_at);
  const config = await loadProposalConfig(id);
  /* Labels come from the proposal's own resolved config, so a renamed or
     reordered slide reads correctly — and an anchor the config no longer has
     still shows, by its raw id. */
  const attention = await proposalAttention(id, config.resolved.slides);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${protocol}://${host}/p/${proposal.slug}`;

  const published = proposal.status === "published";
  const frozenOn = proposal.published_at ? formatMoment(proposal.published_at) : null;

  /* A ordem importa: o que impede o link de abrir vem antes do que só o
     enfraquece. Um rascunho expirado é um rascunho, e é isso que o vendedor
     precisa ler primeiro. */
  const sendState: SendState =
    proposal.status === "unpublished"
      ? "unpublished"
      : !published
        ? "draft"
        : !hasPassword
          ? "no-password"
          : expired
            ? "expired"
            : config.snapshotStale
              ? "stale"
              : "live";

  const checklist: ChecklistItem[] = [
    {
      key: "password",
      label: "Senha",
      done: hasPassword,
      detail: hasPassword
        ? "definida — verificada no servidor a cada abertura."
        : "não definida; ninguém consegue entrar.",
      href: hasPassword ? undefined : "#senha",
      hrefLabel: "Definir agora",
    },
    {
      key: "publish",
      label: "Publicação",
      done: published,
      detail: published
        ? `congelada${frozenOn ? ` em ${frozenOn}` : ""}.`
        : proposal.status === "unpublished"
          ? "despublicada — o link responde “indisponível no momento”."
          : "ainda é um rascunho — o link responde “não encontrado”.",
    },
    {
      key: "expiry",
      label: "Validade",
      done: !expired,
      detail: !proposal.expires_at
        ? "sem data — o link não expira."
        : expired
          ? `expirou em ${formatDay(proposal.expires_at)}.`
          : `aberta até ${formatDay(proposal.expires_at)}.`,
    },
  ];

  const settings = (
    <>
      <Section
        id="dados"
        title="Dados"
        description="Como esta proposta é identificada no painel, e até quando o link responde."
      >
        <DetailsForm
          id={proposal.id}
          title={proposal.title}
          expiresAt={toDateInput(proposal.expires_at)}
        />
      </Section>

      <Section
        id="senha"
        title="Senha"
        description="Verificada no servidor a cada abertura. Ela ainda não pode ser lida de volta — anote na hora."
      >
        <PasswordForm id={proposal.id} hasPassword={hasPassword} />
      </Section>

      <Section id="excluir" title="Excluir" description="Não há como desfazer por esta tela.">
        <DeleteProposalForm id={proposal.id} title={proposal.title} />
      </Section>
    </>
  );

  const readout = (
    <Section
      id="atencao"
      title="Atenção do cliente"
      description="Quanto tempo cada slide segurou a leitura, do mais lido para o menos. Suas próprias aberturas não entram na conta."
    >
      <div className="flex flex-col gap-6">
        <AttentionTable attention={attention} />
        {/* Só quando há o que zerar. Um botão desativado ao lado de "ninguém
            abriu esta proposta ainda" seria a mesma frase duas vezes. */}
        {attention.sessionCount > 0 && (
          <ResetAttentionForm
            id={proposal.id}
            title={proposal.title}
            sessionCount={attention.sessionCount}
          />
        )}
      </div>
    </Section>
  );

  return (
    /* `animate-fade` e não `animate-rise`: a coluna carrega um `<aside>`
       grudento, e uma animação de entrada que translada mexeria com ele durante
       os 260ms. Opacidade sozinha não move nada de lugar. */
    <div className="grid gap-6 animate-fade lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {/* Antes de mandar, esta tela é um formulário; depois de mandar, é um
          relatório. A ordem segue a pergunta que se volta aqui para fazer — e a
          troca acontece uma vez por proposta, na abertura do cliente. O primeiro
          fio some: sob a faixa grudenta ele seria uma segunda borda colada na
          primeira. */}
      <div className="flex flex-col gap-8 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        {attention.sessionCount > 0 ? (
          <>
            {readout}
            {settings}
          </>
        ) : (
          <>
            {settings}
            {readout}
          </>
        )}
      </div>

      {/* Grudento, como os painéis das outras abas: a resposta para "dá pra
          mandar isto agora?" não deveria depender de onde a rolagem parou. */}
      <aside className="order-first lg:order-none lg:sticky lg:top-[var(--admin-sticky)]">
        <PublishPanel
          id={proposal.id}
          url={publicUrl}
          sendState={sendState}
          checklist={checklist}
        />
      </aside>
    </div>
  );
}
