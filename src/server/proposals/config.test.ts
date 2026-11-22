import { beforeAll, describe, expect, it } from "vitest";
import { anchorsOf } from "@/deck/anchors";
import { buildDefaultDeck } from "@/deck/defaults";

/* The pure half of the only writer of `config_override`. No database, the same
   way `dal.ts` has none: everything worth getting wrong here is a decision about
   the delta, and the query around it is four lines.

   The secret is set before the import because `config.ts` reaches `forVisitor`
   through `dal.ts`, which pulls in the cookie signer at module load. The
   Supabase client — the one that would open a connection — is imported lazily
   and is never reached from here. */
process.env.PROPOSAL_COOKIE_SECRET = "test-secret-do-not-use-anywhere-else";

type Config = typeof import("@/server/proposals/config");
let enabledDelta: Config["enabledDelta"];
let isSnapshotStale: Config["isSnapshotStale"];
let mergeOverride: Config["mergeOverride"];
let resolveForProposal: Config["resolveForProposal"];

beforeAll(async () => {
  ({ enabledDelta, isSnapshotStale, mergeOverride, resolveForProposal } = await import(
    "@/server/proposals/config"
  ));
});

describe("mergeOverride — each form owns a key", () => {
  it("a top-level key replaces rather than accumulates", () => {
    const merged = mergeOverride({ hidden: ["cases"] }, { hidden: ["audience"] });
    expect(merged.hidden).toEqual(["audience"]);
  });

  it("saving one form does not touch another form's key", () => {
    const merged = mergeOverride({ hidden: ["cases"], order: ["total"] }, { hidden: [] });

    expect(merged.order).toEqual(["total"]);
    expect(merged.hidden).toBeUndefined();
  });

  /* The bug this prevents is quiet and expensive: the salesperson sets the
     calculator seed, then five minutes later sets the image tariffs, and the
     seed reverts to the default with nothing on screen saying so. */
  it("estimate merges one level, so two forms do not overwrite each other", () => {
    const withSeed = mergeOverride(
      {},
      { estimate: { defaults: { dryOptions: 4, wetOptions: 5, unitTypes: [] } } },
    );
    const withPrices = mergeOverride(withSeed, {
      estimate: { imagePrices: { base: 99, option: 33 } },
    });

    expect(withPrices.estimate?.defaults?.dryOptions).toBe(4);
    expect(withPrices.estimate?.imagePrices).toEqual({ base: 99, option: 33 });
  });

  it("a later write to the same estimate key still replaces it", () => {
    const first = mergeOverride({}, { estimate: { imagePrices: { base: 99, option: 33 } } });
    const second = mergeOverride(first, { estimate: { imagePrices: { base: 70, option: 20 } } });

    expect(second.estimate?.imagePrices).toEqual({ base: 70, option: 20 });
  });

  it("prunes empty keys, so an untouched proposal stores {}", () => {
    /* Not cosmetic: `config_override = {}` in a row is the identity
       resolve(base, null) === base, visible in the database. */
    const merged = mergeOverride(
      { hidden: ["cases"] },
      { hidden: [], shown: [], order: [], estimate: {} },
    );
    expect(merged).toEqual({});
  });

  it("never produces a `chrome` key", () => {
    // DeckOverride has no such key; this pins that a cast cannot smuggle one in,
    // because that is the field that would ship the cost panel to a client.
    const merged = mergeOverride({}, { chrome: { allowPriceOverride: true } } as never);
    expect("chrome" in merged).toBe(false);
  });
});

describe("enabledDelta — minimal against the shipped defaults", () => {
  it("says nothing about a slide that already agrees with the default", () => {
    const delta = enabledDelta(
      new Map([
        ["cases", true],
        ["audience", false],
      ]),
    );
    expect(delta).toEqual({ hidden: [], shown: [] });
  });

  it("hides a slide that ships enabled", () => {
    expect(enabledDelta(new Map([["cases", false]]))).toEqual({ hidden: ["cases"], shown: [] });
  });

  it("shows a slide that ships disabled", () => {
    // differentiators and audience are `enabled: false` in the default deck.
    expect(enabledDelta(new Map([["audience", true]]))).toEqual({
      hidden: [],
      shown: ["audience"],
    });
  });

  it("ignores an id the default deck does not have", () => {
    expect(enabledDelta(new Map([["nao-existe", false]]))).toEqual({ hidden: [], shown: [] });
  });

  it("round-trips through resolve to the state the picker asked for", () => {
    const desired = new Map([
      ["cases", false],
      ["differentiators", true],
    ]);
    const resolved = resolveForProposal(enabledDelta(desired), "cliente-abc");
    const ids = anchorsOf(resolved.slides).map((a) => a.id);

    expect(ids).not.toContain("cases");
    expect(ids).toContain("differentiators");
  });
});

describe("resolveForProposal — what publishing would freeze", () => {
  it("forces allowPriceOverride false", () => {
    // The composer must preview exactly what publish writes, or the freeze
    // guarantee is only true in the function that happens to call forVisitor.
    expect(buildDefaultDeck().chrome.allowPriceOverride).toBe(true);
    expect(resolveForProposal({}, "cliente-abc").chrome.allowPriceOverride).toBe(false);
  });

  it("stamps the slug as the key", () => {
    expect(resolveForProposal({}, "cliente-abc").key).toBe("cliente-abc");
  });
});

describe("isSnapshotStale", () => {
  const resolved = () => resolveForProposal({}, "cliente-abc");

  it("a snapshot equal to what publishing would produce is not stale", () => {
    expect(isSnapshotStale(resolved(), resolved())).toBe(false);
  });

  /* The reason this is a deep compare and not a string compare. `jsonb` gives
     object keys back in Postgres's order, so a snapshot read from the database
     never string-matches a freshly built config — and every published proposal
     would read as stale, permanently. */
  it("is not fooled by the key order jsonb hands back", () => {
    const reordered = reorderKeys(resolved());

    // Sanity: the stand-in really did move the keys, or this asserts nothing.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(resolved()));
    expect(isSnapshotStale(resolved(), reordered)).toBe(false);
  });

  it("a real change makes it stale", () => {
    const changed = resolveForProposal({ hidden: ["cases"] }, "cliente-abc");
    expect(isSnapshotStale(changed, resolved())).toBe(true);
  });

  it("a null snapshot is stale", () => {
    expect(isSnapshotStale(resolved(), null)).toBe(true);
  });
});

/** Rebuilds every object with its keys reversed — a stand-in for what a jsonb
    round trip does to key order, without needing a database to prove it. */
function reorderKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reorderKeys);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).reverse();
    return Object.fromEntries(entries.map(([k, v]) => [k, reorderKeys(v)]));
  }
  return value;
}
