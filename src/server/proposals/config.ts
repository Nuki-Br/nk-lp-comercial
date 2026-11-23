import "server-only";

import { buildDefaultDeck } from "@/deck/defaults";
import { type DeckOverride, parseDeckOverride } from "@/deck/overrides";
import { resolveDeckConfig } from "@/deck/resolve";
import type { DeckConfig } from "@/deck/types";
import { type ValidationIssue, validateDeckConfig } from "@/server/config/validate";
import { forVisitor } from "@/server/proposals/dal";
import type { Json } from "@/server/supabase/database.types";

/* `supabaseAdmin` is imported lazily inside the two functions that need it, for
   the reason `dal.ts` spells out: it reads SUPABASE_URL and SUPABASE_SECRET_KEY
   at module load and throws without them. A top-level import would drag the
   database client into every load of this module, including the one CI does to
   test the merge, the delta and the staleness predicate — which is all of the
   logic here worth getting wrong.

   It does not make this module env-free: `forVisitor` comes from `dal.ts`, which
   pulls in the cookie signer, which needs PROPOSAL_COOKIE_SECRET. That is a
   string, not a connection, and the test supplies one. */
const adminClient = async () => (await import("@/server/supabase/adminClient")).supabaseAdmin;

/* THE ONLY WRITER of `proposals.config_override`.
 *
 * Every composer form funnels through `saveProposalOverride`, which resolves the
 * merged delta and validates it before the write. A second write path is a way
 * for an unvalidated config to reach a client, so there is one.
 *
 * Runs behind requireAdmin() and does not check it — same rule as `admin.ts`: a
 * function that authorizes itself is a function someone will call from a place
 * that forgot to.
 */

export type ProposalConfigView = {
  slug: string;
  /** The stored delta, parsed. Never throws — a corrupt row degrades to `{}`. */
  override: DeckOverride;
  /** Defaults + delta. What a draft renders, and what publishing would freeze. */
  resolved: DeckConfig;
  published: boolean;
  /**
   * Published, and the frozen snapshot no longer matches what publishing now
   * would produce. Also true when a default in `src/content/` moved — which is
   * correct, and is the ADR 13 guarantee made visible rather than merely true.
   */
  snapshotStale: boolean;
};

export type SaveResult =
  | { ok: true; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[]; warnings: ValidationIssue[] };

/**
 * Structural equality.
 *
 * NOT `JSON.stringify(a) === JSON.stringify(b)`, and the difference is not
 * academic: `jsonb` is a parsed binary representation, so a config read back
 * from Postgres has its object keys in Postgres's order (by length, then bytes)
 * while a freshly built one has them in source order. Arrays keep their order —
 * which is what `DeckOverride.order` relies on — but a string compare across
 * that boundary is always unequal, and `snapshotStale` would read `true` for
 * every published proposal forever.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;

  const arrayA = Array.isArray(a);
  if (arrayA !== Array.isArray(b)) return false;
  if (arrayA) {
    const left = a as unknown[];
    const right = b as unknown[];
    return left.length === right.length && left.every((v, i) => deepEqual(v, right[i]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((k) => Object.hasOwn(right, k) && deepEqual(left[k], right[k]))
  );
}

/**
 * Drop keys that carry no information.
 *
 * An `{ hidden: [] }` resolves identically to no key at all, so storing it only
 * makes the delta look like a customization that was never made — and it costs
 * the one property worth keeping observable in the database: an untouched
 * proposal's `config_override` is literally `{}`, which is the identity
 * `resolve(base, null) === base` visible in a row.
 */
function pruneOverride(override: DeckOverride): DeckOverride {
  const out: DeckOverride = {};

  if (override.order?.length) out.order = override.order;
  if (override.hidden?.length) out.hidden = override.hidden;
  if (override.shown?.length) out.shown = override.shown;
  if (override.slides && Object.keys(override.slides).length > 0) out.slides = override.slides;
  if (override.document && Object.keys(override.document).length > 0) {
    out.document = override.document;
  }

  return out;
}

/**
 * Merge one editor's patch into the stored delta.
 *
 * Top-level keys REPLACE, because each composer form owns a whole key: the
 * slide picker owns `order`/`hidden`/`shown`.
 */
export function mergeOverride(previous: DeckOverride, patch: Partial<DeckOverride>): DeckOverride {
  const next: DeckOverride = { ...previous };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    Object.assign(next, { [key]: value });
  }

  return pruneOverride(next);
}

/** Defaults + delta, with the render-site key already applied. This is
    what publishing freezes, so the composer must preview exactly it. */
export function resolveForProposal(override: DeckOverride, slug: string): DeckConfig {
  return forVisitor(resolveDeckConfig(buildDefaultDeck(), override), slug);
}

/** Would publishing now produce something other than what the client already
    has? Separated from the query so it is testable without a database. */
export function isSnapshotStale(resolved: DeckConfig, snapshot: unknown): boolean {
  return !deepEqual(resolved, snapshot);
}

export async function loadProposalConfig(id: string): Promise<ProposalConfigView> {
  const supabaseAdmin = await adminClient();
  const { data: row, error } = await supabaseAdmin
    .from("proposals")
    .select("slug, status, config_override, config_snapshot")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) throw new Error("Could not load the proposal configuration.");

  const override = parseDeckOverride(row.config_override);
  const resolved = resolveForProposal(override, row.slug);
  const published = row.status === "published";

  return {
    slug: row.slug,
    override,
    resolved,
    published,
    snapshotStale: published && isSnapshotStale(resolved, row.config_snapshot),
  };
}

/**
 * Resolve, validate, then write — in that order, always.
 *
 * Validation runs against the RESOLVED config and not against the delta,
 * because every invariant worth enforcing is a fact about the rendered deck:
 * an orphaned demo only exists once its parent's `enabled` is known, and "no
 * slide enabled" only once `hidden` and `shown` have been applied.
 *
 * Nothing is written when it fails. The admin gets the issues back and the
 * stored delta is exactly what it was.
 */
export async function saveProposalOverride(
  id: string,
  patch: Partial<DeckOverride>,
): Promise<SaveResult> {
  const current = await loadProposalConfig(id);
  const merged = mergeOverride(current.override, patch);
  const resolved = resolveForProposal(merged, current.slug);

  const validation = validateDeckConfig(resolved);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues, warnings: validation.warnings };
  }

  const supabaseAdmin = await adminClient();
  const { error } = await supabaseAdmin
    .from("proposals")
    /* Through `Json` because that is what PostgREST's generated types call a
       jsonb column. `DeckOverride` is JSON-serializable by contract — the same
       round-trip test that covers `DeckConfig` covers what goes in here. */
    .update({ config_override: merged as unknown as Json })
    .eq("id", id);

  if (error) throw new Error(`Could not save the configuration: ${error.message}`);
  return { ok: true, warnings: validation.warnings };
}

/**
 * The enabled-state delta, computed against the shipped defaults.
 *
 * Delta-minimal on purpose: a slide whose desired state already agrees with
 * `buildDefaultDeck()` appears in neither array. The consequence, stated rather
 * than discovered — if a default's `enabled` later flips, an untouched draft
 * follows it. That is the same property that lets a copy fix in `src/content/`
 * reach drafts (ADR 13), and a published proposal is frozen regardless.
 */
export function enabledDelta(desired: Map<string, boolean>): {
  hidden: string[];
  shown: string[];
} {
  const defaults = new Map(buildDefaultDeck().slides.map((n) => [n.id, n.enabled]));
  const hidden: string[] = [];
  const shown: string[] = [];

  for (const [id, want] of desired) {
    const byDefault = defaults.get(id);
    if (byDefault === undefined || byDefault === want) continue;
    if (want) shown.push(id);
    else hidden.push(id);
  }

  return { hidden, shown };
}
