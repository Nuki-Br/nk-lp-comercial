import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Deck } from "@/components/deck/Deck";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { loadProposalConfig } from "@/server/proposals/config";

/**
 * A prévia do compositor. **Um iframe, não uma tela.**
 *
 * Mora no grupo `(deck)` porque é ali que o CSS do deck é carregado, e o painel
 * tem regra explícita de nunca carregar CSS de deck (AGENTS.md, tabela de
 * camadas). Renderizar o deck dentro do `(admin)` obrigaria a importar
 * `deck.css` + `slides.css` do outro lado da fronteira — inclusive o
 * `scroll-snap-type` sem escopo — e é exatamente o vazamento que a ADR 17
 * fechou com dois root layouts. Um iframe de mesma origem mantém as duas
 * folhas separadas e ainda deixa o compositor rolar a prévia por
 * `getElementById`. ADR 22.
 *
 * Três coisas que este arquivo NÃO faz, e cada uma é uma regra:
 *
 * - **Não monta tracking.** `behaviors` fica vazio, então o coletor não está no
 *   chunk desta rota. É o segundo teste da Regra 2 — "o código coletor é
 *   alcançável fora de `/p/[slug]`?" — respondido por construção.
 * - **Não é caminho de visitante.** `loadProposalConfig` lê o delta VIVO, que é
 *   o ponto (o vendedor quer ver o que ainda não publicou), e por isso a única
 *   autorização aceitável aqui é `requireAdmin()`. `/p/[slug]` continua sendo a
 *   única porta do cliente, pela DAL, e continua renderizando só o snapshot.
 * - **Não é proxiada.** `proxy.ts` cobre `/admin` e só; a autoridade é esta
 *   chamada no topo da página, como em toda página do painel. ADR 15.
 *
 * `resolveForProposal` já passa o config pelo `forVisitor`, então a prévia
 * renderiza exatamente o documento que publicar congelaria.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Genérico, e nunca derivado da proposta — mesma razão do `/p/[slug]`: o
    `<title>` é a parte da página que escapa mais fácil. `description` e
    `openGraph` são sobrescritos porque o metadata de página faz merge raso com
    o do root layout, que carrega a copy de marketing do deck. */
const GENERIC = "Prévia interna de uma apresentação Nuki.";

export const metadata: Metadata = {
  title: "Prévia da apresentação",
  description: GENERIC,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Nuki",
    locale: "pt_BR",
    title: "Prévia da apresentação",
    description: GENERIC,
    images: [],
  },
};

export default async function ProposalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  /* No topo, sempre. */
  await requireAdmin();

  const { id } = await params;

  /* `loadProposalConfig` estoura tanto num id inexistente quanto num uuid
     malformado — o Postgres recusa o cast antes de olhar a tabela. Os dois são
     404 para quem está olhando, e nenhum dos dois merece um 500 no meio de uma
     prévia. */
  let config: Awaited<ReturnType<typeof loadProposalConfig>>;
  try {
    config = await loadProposalConfig(id);
  } catch {
    notFound();
  }

  return <Deck config={config.resolved} />;
}
