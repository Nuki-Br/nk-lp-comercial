import type { Metadata } from "next";
import { Deck } from "@/components/deck/Deck";
import { DeckTracking } from "@/components/deck/DeckTracking";
import { ProposalGate } from "@/components/deck/ProposalGate";
import { loadProposalForVisitor } from "@/server/proposals/dal";

/* Never cached, never prerendered, never shared between visitors. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GENERIC ON PURPOSE, and never derived from the proposal.
 *
 * A `generateMetadata` that read the stored document title would put the
 * client's name in the `<title>` of a page nobody has unlocked — the `curl`
 * check in testing.md checklist B greps for exactly that class of leak.
 *
 * `description` and `openGraph` are overridden rather than left to inherit, and
 * that is not tidiness. The `(deck)` root layout carries the deck's marketing
 * description — "Do planejamento do memorial à validação em obra…" — and page
 * metadata is shallow-merged, so without these two keys the locked page ships
 * deck copy in its `<head>`. Checklist B's `grep -ci "planejamento"` caught it
 * on the first run.
 */
const GENERIC = "Proposta comercial Nuki.";

export const metadata: Metadata = {
  title: "Proposta Nuki",
  description: GENERIC,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Nuki",
    locale: "pt_BR",
    title: "Proposta Nuki",
    description: GENERIC,
    /* No image. The default one is the deck's cover. */
    images: [],
  },
};

export default async function ProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  /* The ONLY path to proposal content. Everything this page knows, it knows
     from here. */
  const view = await loadProposalForVisitor(slug);

  if (view.state === "not-found") {
    return <Notice title="Proposta não encontrada" body="Confira o link que você recebeu." />;
  }

  if (view.state === "expired") {
    return (
      <Notice
        title="Esta proposta expirou"
        body="Fale com o seu contato na Nuki para receber um link novo."
      />
    );
  }

  /* Zero content. No price, no slide copy, no client name — the gate knows the
     slug and nothing else, and the slug is already in the URL bar. */
  if (view.state === "locked") {
    return <ProposalGate slug={slug} />;
  }

  return <Deck config={view.config} behaviors={<DeckTracking slug={slug} />} />;
}

/** Reuses the gate's card so the three states look like one product. */
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="gate-tag">Nuki</span>
        <h1 className="gate-title">{title}</h1>
        <p className="gate-lead">{body}</p>
      </div>
    </div>
  );
}
