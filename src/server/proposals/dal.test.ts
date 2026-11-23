import { beforeAll, describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
/* Type-only, so it is erased and does not pull the module in before the env is
   set below. The runtime import happens in beforeAll. */
import type { ProposalAccessRow } from "@/server/proposals/dal";

/* The decision table. docs/testing.md requires it, and it is the single most
   valuable test in the repo: every other control is depth behind this function.

   No database, by construction — the fetcher is a parameter. That constraint is
   what keeps CI database-free AND what makes this table enumerable at all. */

process.env.PROPOSAL_COOKIE_SECRET = "test-secret-do-not-use-anywhere-else";

type Dal = typeof import("@/server/proposals/dal");
type Session = typeof import("@/server/auth/proposalSession");

let dal: Dal;
let session: Session;

const PROPOSAL_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_ID = "11111111-2222-3333-4444-555555555555";
const SLUG = "construtora-exemplo-2026";
const NOW = 1_770_000_000_000;

const snapshot = () => {
  const config = structuredClone(buildDefaultDeck());
  config.key = "fast";
  return config;
};

/** What a snapshot frozen before ADRs 26 and 27 still carries, on top of today's
    deck: three slide kinds that no longer render, the calculator's `estimate`
    block and the price-panel flag in `chrome`. */
const legacySnapshot = () => {
  const config = snapshot() as unknown as {
    slides: Record<string, unknown>[];
    estimate?: unknown;
    chrome: Record<string, unknown>;
  };
  config.slides.push(
    { kind: "pricing", id: "pricing", label: "Plano", enabled: true },
    { kind: "calculator", id: "calculator", label: "Estime o setup", enabled: true },
    { kind: "total", id: "total", label: "Total estimado", enabled: true },
  );
  config.estimate = { imagePrices: { base: 84, option: 28 }, maxMonths: 36 };
  config.chrome.allowPriceOverride = true;
  return config;
};

const publishedRow = (over: Partial<ProposalAccessRow> = {}): ProposalAccessRow => ({
  id: PROPOSAL_ID,
  status: "published",
  expires_at: null as string | null,
  access_epoch: 1,
  config_snapshot: snapshot() as unknown,
  ...over,
});

const view = (row: ReturnType<typeof publishedRow> | null, token?: string, now = NOW) =>
  dal.resolveVisitorView(SLUG, {
    fetchRow: async () => row,
    readCookie: () => token,
    now,
  });

const goodToken = () => session.signProposalSession({ pid: PROPOSAL_ID, epoch: 1 }, NOW);

beforeAll(async () => {
  session = await import("@/server/auth/proposalSession");
  dal = await import("@/server/proposals/dal");
});

describe("resolveVisitorView — the states", () => {
  it("not-found when there is no row", async () => {
    expect(await view(null)).toEqual({ state: "not-found" });
  });

  it("not-found for a draft, even with a valid cookie", async () => {
    const row = publishedRow({ status: "draft" });
    expect(await view(row, goodToken())).toEqual({ state: "not-found" });
  });

  it("not-found for an archived proposal", async () => {
    const row = publishedRow({ status: "archived" });
    expect(await view(row, goodToken())).toEqual({ state: "not-found" });
  });

  /* Deliberately NOT not-found: unlike a draft, the client already holds this
     link, so there is nothing left to protect by pretending it never existed. */
  it("unpublished — even with a valid cookie — for a proposal taken down", async () => {
    const row = publishedRow({ status: "unpublished" });
    expect(await view(row, goodToken())).toEqual({ state: "unpublished" });
  });

  it("expired once past expires_at — even holding a valid cookie", async () => {
    const row = publishedRow({ expires_at: new Date(NOW - 1000).toISOString() });
    expect(await view(row, goodToken())).toEqual({ state: "expired" });
  });

  it("still open one second before expires_at", async () => {
    const row = publishedRow({ expires_at: new Date(NOW + 1000).toISOString() });
    const result = await view(row, goodToken());
    expect(result.state).toBe("unlocked");
  });

  it("locked with no cookie", async () => {
    expect(await view(publishedRow())).toEqual({ state: "locked", reason: "no-cookie" });
  });

  it("unlocked with a valid cookie", async () => {
    const result = await view(publishedRow(), goodToken());
    expect(result.state).toBe("unlocked");
    if (result.state === "unlocked") expect(result.proposalId).toBe(PROPOSAL_ID);
  });
});

describe("resolveVisitorView — the cookie gates", () => {
  it("locked when the cookie is tampered with", async () => {
    const token = goodToken();
    const tampered = `${token.slice(0, -1)}${token.at(-1) === "A" ? "B" : "A"}`;
    expect(await view(publishedRow(), tampered)).toEqual({
      state: "locked",
      reason: "bad-signature",
    });
  });

  it("locked when the cookie has expired", async () => {
    const token = session.signProposalSession({ pid: PROPOSAL_ID, epoch: 1 }, NOW, 60);
    const result = await view(publishedRow(), token, NOW + 61_000);
    expect(result).toEqual({ state: "locked", reason: "expired-cookie" });
  });

  it("locked when proposal A's cookie is presented for proposal B", async () => {
    const foreign = session.signProposalSession({ pid: OTHER_ID, epoch: 1 }, NOW);
    expect(await view(publishedRow(), foreign)).toEqual({
      state: "locked",
      reason: "wrong-proposal",
    });
  });

  /* Revocation. Bumping access_epoch on the row invalidates every cookie ever
     issued, with no cookie-side bookkeeping to get wrong. */
  it("locked after the access epoch is bumped", async () => {
    const token = goodToken();
    const row = publishedRow({ access_epoch: 2 });
    expect(await view(row, token)).toEqual({ state: "locked", reason: "stale-epoch" });
  });
});

describe("resolveVisitorView — what it hands the renderer", () => {
  /* The client keeps the link; what they get is the same document without the
     retired slides — and without their nav dots, which would otherwise point at
     nothing and blank the whole progress nav. */
  it("hands back a legacy snapshot without what was retired", async () => {
    const row = publishedRow({ config_snapshot: legacySnapshot() as unknown });
    const result = await view(row, goodToken());
    expect(result.state).toBe("unlocked");
    if (result.state !== "unlocked") return;

    const ids = result.config.slides.map((node) => node.id);
    for (const retired of ["pricing", "calculator", "total"]) {
      expect(ids).not.toContain(retired);
    }
    expect(result.config).not.toHaveProperty("estimate");
    expect(result.config.chrome).not.toHaveProperty("allowPriceOverride");
    /* Everything else is the document as it was frozen. */
    expect(result.config).toEqual({ ...buildDefaultDeck(), key: SLUG });
  });

  it("stamps the slug as the config key", async () => {
    const result = await view(publishedRow(), goodToken());
    if (result.state !== "unlocked") throw new Error("expected unlocked");
    expect(result.config.key).toBe(SLUG);
  });

  it("emits nothing at all when locked", async () => {
    const result = await view(publishedRow());
    /* The whole object, not a subset: any content field added here later would
       break this test, which is the intent. */
    expect(Object.keys(result).sort()).toEqual(["reason", "state"]);
  });

  it("refuses to render live defaults when the snapshot is unusable", async () => {
    for (const broken of [null, {}, { slides: [] }, "not an object", 42]) {
      const row = publishedRow({ config_snapshot: broken });
      expect(await view(row, goodToken()), `snapshot ${JSON.stringify(broken)}`).toEqual({
        state: "not-found",
      });
    }
  });
});

/* The read half of "validate at both boundaries", and it is asymmetric with the
   write half on purpose. Refusing a save costs an admin a click; refusing a
   render costs a client their link mid-meeting — and every snapshot here was
   already validated at publish, so a failure now usually means this deploy's
   validator is stricter than the one that sent the document. ADR 18: degrade. */
describe("resolveVisitorView — a snapshot that fails today's validator", () => {
  const unlocked = async (mutate: (config: ReturnType<typeof snapshot>) => void) => {
    const config = snapshot();
    mutate(config);
    return view(publishedRow({ config_snapshot: config as unknown }), goodToken());
  };

  it("still renders a demo whose module the write path would have refused to hide", async () => {
    const result = await unlocked((config) => {
      const demo = config.slides.find((n) => n.parentId);
      const parent = config.slides.find((n) => n.id === demo?.parentId);
      if (parent) parent.enabled = false;
    });

    expect(result.state).toBe("unlocked");
  });

  it("but refuses a deck with nothing enabled", async () => {
    /* The one exception, and it is reachable: `deckConfigSchema` requires one
       slide NODE, never one ENABLED node, so this passes the parse and renders a
       blank page. A blank page reads to a client as a broken link. */
    const result = await unlocked((config) => {
      for (const node of config.slides) node.enabled = false;
    });

    expect(result).toEqual({ state: "not-found" });
  });
});
