import "server-only";

import { randomBytes } from "node:crypto";
import { buildDefaultDeck } from "@/deck/defaults";
import { parseDeckOverride } from "@/deck/overrides";
import { resolveDeckConfig } from "@/deck/resolve";
import { hashPassword } from "@/server/auth/password";
import { validateDeckConfig } from "@/server/config/validate";
import { forVisitor, isProposalExpired } from "@/server/proposals/dal";
import { supabaseAdmin } from "@/server/supabase/adminClient";
import type { Json } from "@/server/supabase/database.types";

/* Admin-side writes. Everything here runs behind requireAdmin(); nothing here
   checks it, because a function that authorizes itself is a function someone
   will call from a place that forgot to. The check belongs at the entry point.

   Uses the admin client rather than the RLS-bound one, for one reason:
   proposal_access grants nothing to `authenticated` at all — it is service-role
   only, deliberately, because it holds password hashes. */

export type ProposalSummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  expiresAt: string | null;
  clientName: string;
  hasPassword: boolean;
  openCount: number;
};

/** `nome-do-cliente-<8 random>`.
 *
 * The random tail is not decoration. A slug is the whole address of a
 * commercial document that travels over WhatsApp, and `construtora-x` would be
 * guessable by anyone who knows the client list. 40 bits of base32 is not a
 * password — the password is the password — but it stops enumeration.
 *
 * Shaped to satisfy `proposals_slug_format` in the migration: lowercase,
 * hyphen-separated, 8..63, no leading or trailing hyphen. */
export function buildProposalSlug(clientName: string): string {
  const base = clientName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const tail = randomBytes(5).toString("hex");
  return base ? `${base}-${tail}` : `proposta-${tail}`;
}

export async function listProposals(): Promise<ProposalSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("proposals")
    .select("id, slug, title, status, expires_at, clients(name)")
    /* Archived is this schema's delete — the row and its tracking history stay,
       but a deleted proposal has no business in the list a salesperson works
       from every day. */
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not list proposals: ${error.message}`);

  const rows = data ?? [];
  const counts = await openCounts(rows.map((r) => r.id));
  const withPassword = await proposalsWithLiveCredential(rows.map((r) => r.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    expiresAt: row.expires_at,
    clientName: row.clients?.name ?? "—",
    hasPassword: withPassword.has(row.id),
    openCount: counts.get(row.id) ?? 0,
  }));
}

/** The raw open count, and nothing else — the read-out UI is stage 3. */
async function openCounts(proposalIds: string[]): Promise<Map<string, number>> {
  if (proposalIds.length === 0) return new Map();

  const { data } = await supabaseAdmin
    .from("proposal_view_sessions")
    .select("proposal_id")
    .in("proposal_id", proposalIds)
    .eq("is_internal", false);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.proposal_id, (counts.get(row.proposal_id) ?? 0) + 1);
  }
  return counts;
}

async function proposalsWithLiveCredential(proposalIds: string[]): Promise<Set<string>> {
  if (proposalIds.length === 0) return new Set();

  const { data } = await supabaseAdmin
    .from("proposal_access")
    .select("proposal_id")
    .in("proposal_id", proposalIds)
    .is("revoked_at", null);

  return new Set((data ?? []).map((row) => row.proposal_id));
}

export async function getProposal(id: string) {
  const { data, error } = await supabaseAdmin
    .from("proposals")
    .select("id, slug, title, status, expires_at, access_epoch, published_at, clients(id, name)")
    .eq("id", id)
    /* A deleted proposal is `neq`'d out, not fetched-and-hidden: the composer
       has no "it's gone" screen to fall back to, and a 404 for an id that no
       longer resolves to anything is the honest read. */
    .neq("status", "archived")
    .maybeSingle();

  if (error) throw new Error(`Could not load the proposal: ${error.message}`);
  return data;
}

/** O que decide se o link do cliente abre AGORA. */
export type SendReadiness = {
  hasPassword: boolean;
  expired: boolean;
};

/**
 * As duas condições que a Visão geral reporta, das duas fontes que as sabem.
 *
 * O relógio mora aqui, e não na página, por dois motivos que dão no mesmo: um
 * componente que chama `Date.now()` no render é impuro (a regra de lint do React
 * recusa, e com razão), e a pergunta "já expirou?" é da camada que também a
 * responde para o visitante — daí `isProposalExpired`, e não uma segunda conta.
 *
 * A senha vem de uma linha indexada, não da lista inteira. A página antes lia
 * `listProposals()` e procurava um id lá dentro para extrair um booleano.
 */
export async function proposalSendReadiness(
  id: string,
  expiresAt: string | null,
): Promise<SendReadiness> {
  /* `limit(1)`: nada impede duas credenciais vivas para a mesma proposta — o
     Set em `proposalsWithLiveCredential` já contava com isso — e `maybeSingle`
     sozinho estouraria justamente aí. */
  const { data } = await supabaseAdmin
    .from("proposal_access")
    .select("proposal_id")
    .eq("proposal_id", id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  return { hasPassword: Boolean(data), expired: isProposalExpired(expiresAt, Date.now()) };
}

/**
 * Create from defaults — stage 1's payoff.
 *
 * `config_override` starts as `{}`, which means the proposal IS
 * `buildDefaultDeck()` by the identity `resolve(base, null) === base`. Nothing
 * is copied, so a copy fix in `src/content/` still reaches this draft.
 */
export async function createProposalFromDefaults(input: {
  clientName: string;
  title: string;
  createdBy: string;
}): Promise<{ id: string; slug: string }> {
  const client = await upsertClientByName(input.clientName, input.createdBy);
  const slug = buildProposalSlug(input.clientName);

  const { data, error } = await supabaseAdmin
    .from("proposals")
    .insert({
      client_id: client.id,
      slug,
      title: input.title,
      status: "draft",
      config_override: {},
      created_by: input.createdBy,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`Could not create the proposal: ${error.message}`);
  return data;
}

async function upsertClientByName(name: string, createdBy: string) {
  const slug = buildProposalSlug(name).replace(/-[0-9a-f]{10}$/, "");

  const { data: existing } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({
      name,
      slug: slug || `cliente-${randomBytes(4).toString("hex")}`,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create the client: ${error.message}`);
  return data;
}

export async function updateProposal(
  id: string,
  patch: { title?: string; expiresAt: string | null },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("proposals")
    .update({
      ...(patch.title ? { title: patch.title } : {}),
      expires_at: patch.expiresAt,
    })
    .eq("id", id);

  if (error) throw new Error(`Could not update the proposal: ${error.message}`);
}

/**
 * Set (or rotate) the proposal password.
 *
 * Rotation is revoke-then-insert rather than update, so the history of when a
 * credential changed survives. The partial unique index enforces one live
 * credential per proposal, which makes the order load-bearing.
 *
 * NOT YET: the plaintext copy in Supabase Vault that ADR 14 promises, so a
 * salesperson can re-read the password months later. `vault_secret_id` stays
 * null until the wrapper function exists — vault.* lives outside the exposed
 * schema, so it needs a `public` function granted to service_role only.
 */
export async function setProposalPassword(
  proposalId: string,
  plain: string,
  createdBy: string,
): Promise<void> {
  const passwordHash = await hashPassword(plain);

  const { error: revokeError } = await supabaseAdmin
    .from("proposal_access")
    .update({ revoked_at: new Date().toISOString() })
    .eq("proposal_id", proposalId)
    .is("revoked_at", null);

  if (revokeError) throw new Error(`Could not revoke the old password: ${revokeError.message}`);

  const { error } = await supabaseAdmin
    .from("proposal_access")
    .insert({ proposal_id: proposalId, password_hash: passwordHash, created_by: createdBy });

  if (error) throw new Error(`Could not store the password: ${error.message}`);
}

/**
 * Publish: freeze the resolved config into `config_snapshot`.
 *
 * From here the client sees the snapshot and nothing else. Editing a default in
 * `src/content/` afterwards must not move a number on a document that has been
 * sent — that is ADR 13, and this function is where it becomes true.
 *
 * `forVisitor` is applied BEFORE the write, not just at render, so the frozen
 * document already carries the proposal's own key.
 */
export async function publishProposal(
  id: string,
): Promise<{ ok: true; warnings: string[] } | { ok: false; issues: string[]; warnings: string[] }> {
  const { data: row, error } = await supabaseAdmin
    .from("proposals")
    .select("slug, config_override")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) throw new Error("Could not load the proposal to publish.");

  const resolved = resolveDeckConfig(buildDefaultDeck(), parseDeckOverride(row.config_override));
  const snapshot = forVisitor(resolved, row.slug);

  const validation = validateDeckConfig(snapshot);
  const warnings = validation.warnings.map((i) => i.message);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues.map((i) => i.message), warnings };
  }

  const { error: writeError } = await supabaseAdmin
    .from("proposals")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      /* Through `Json` because that is what PostgREST's generated types call a
         jsonb column. `DeckConfig` is JSON-serializable by contract — there is a
         round-trip test asserting exactly that — so the cast restates a property
         the type system cannot see rather than papering over a doubt. */
      config_snapshot: snapshot as unknown as Json,
    })
    .eq("id", id);

  if (writeError) throw new Error(`Could not publish: ${writeError.message}`);
  return { ok: true, warnings };
}

/**
 * Unpublish: the link stops opening, the document is not gone.
 *
 * `config_snapshot` and `published_at` are left as they are. Neither is read
 * for a non-published proposal — the DAL branches on `status` — and keeping
 * them means a later `publishProposal` overwrites stale
 * data rather than an unpublish having to guess what to null out.
 */
export async function unpublishProposal(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("proposals")
    .update({ status: "unpublished" })
    .eq("id", id);

  if (error) throw new Error(`Could not unpublish: ${error.message}`);
}

/**
 * Delete, in the sense this schema allows: `status = 'archived'`. There is no
 * DELETE grant on `public.proposals` — the migration says why, and it comes
 * down to the tracking rows hanging off a proposal being the record of a real
 * client's real attention, which a salesperson clicking "excluir" by mistake
 * should not be able to erase.
 */
export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("proposals")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw new Error(`Could not delete the proposal: ${error.message}`);
}
