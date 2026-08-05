import { beforeAll, describe, expect, it } from "vitest";

/* The cookie half of "money, passwords and time" (ADR 12).

   The module reads PROPOSAL_COOKIE_SECRET at import time and throws without it —
   deliberately, per docs/deployment.md. So the env is set here BEFORE a dynamic
   import; a static import would be hoisted above the assignment and every test
   would die on module load. */

process.env.PROPOSAL_COOKIE_SECRET = "test-secret-do-not-use-anywhere-else";

type SessionModule = typeof import("@/server/auth/proposalSession");
let mod: SessionModule;

const PROPOSAL_A = "11111111-2222-3333-4444-555555555555";
const PROPOSAL_B = "99999999-8888-7777-6666-555555555555";
const NOW = 1_770_000_000_000; // fixed, so "expired by 1s" means exactly that
const EXPECTED_A = { proposalId: PROPOSAL_A, accessEpoch: 1 };

beforeAll(async () => {
  mod = await import("@/server/auth/proposalSession");
});

describe("signProposalSession / verifyProposalSession", () => {
  it("accepts a cookie it just minted", () => {
    const token = mod.signProposalSession({ pid: PROPOSAL_A, epoch: 1 }, NOW);
    const verdict = mod.verifyProposalSession(token, EXPECTED_A, NOW);

    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.payload.pid).toBe(PROPOSAL_A);
  });

  it("rejects it one second after expiry", () => {
    const ttl = 60;
    const token = mod.signProposalSession({ pid: PROPOSAL_A, epoch: 1 }, NOW, ttl);

    /* One millisecond before the boundary it is still good. The assertion is
       the pair, not the failure alone: an implementation that rejected
       everything would pass half of this test. */
    expect(mod.verifyProposalSession(token, EXPECTED_A, NOW + ttl * 1000 - 1).ok).toBe(true);

    const expired = mod.verifyProposalSession(token, EXPECTED_A, NOW + (ttl + 1) * 1000);
    expect(expired).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a one-byte tamper anywhere in the token", () => {
    const token = mod.signProposalSession({ pid: PROPOSAL_A, epoch: 1 }, NOW);

    for (const index of [0, Math.floor(token.length / 2), token.length - 1]) {
      const original = token[index];
      const swapped = original === "A" ? "B" : "A";
      const tampered = `${token.slice(0, index)}${swapped}${token.slice(index + 1)}`;
      if (tampered === token) continue;

      const verdict = mod.verifyProposalSession(tampered, EXPECTED_A, NOW);
      expect(verdict.ok, `tamper at index ${index} was accepted`).toBe(false);
    }
  });

  it("rejects proposal A's cookie presented for proposal B", () => {
    const token = mod.signProposalSession({ pid: PROPOSAL_A, epoch: 1 }, NOW);
    const verdict = mod.verifyProposalSession(
      token,
      { proposalId: PROPOSAL_B, accessEpoch: 1 },
      NOW,
    );

    expect(verdict).toEqual({ ok: false, reason: "wrong-proposal" });
  });

  /* Revocation, and the reason access_epoch exists: bumping one integer on the
     row invalidates every cookie ever issued, with nothing to clean up. */
  it("rejects a cookie minted under an older access epoch", () => {
    const token = mod.signProposalSession({ pid: PROPOSAL_A, epoch: 1 }, NOW);
    const verdict = mod.verifyProposalSession(
      token,
      { proposalId: PROPOSAL_A, accessEpoch: 2 },
      NOW,
    );

    expect(verdict).toEqual({ ok: false, reason: "stale-epoch" });
  });

  it("rejects a forged payload signed with the wrong key", () => {
    const forgedBody = Buffer.from(
      JSON.stringify({ pid: PROPOSAL_A, epoch: 1, exp: 2_000_000_000 }),
    ).toString("base64url");
    const forged = `${forgedBody}.${Buffer.from("x".repeat(32)).toString("base64url")}`;

    expect(mod.verifyProposalSession(forged, EXPECTED_A, NOW)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("treats missing and shapeless tokens as malformed, never as an exception", () => {
    for (const token of [undefined, null, "", "no-dot", "a.b.c", ".", "a."]) {
      const verdict = mod.verifyProposalSession(token, EXPECTED_A, NOW);
      expect(verdict.ok, `${JSON.stringify(token)} was accepted`).toBe(false);
    }
  });
});

describe("proposalCookieName", () => {
  it("is per-proposal, so a second proposal does not evict the first", () => {
    expect(mod.proposalCookieName(PROPOSAL_A)).not.toBe(mod.proposalCookieName(PROPOSAL_B));
  });

  it("is stable and hyphen-free", () => {
    expect(mod.proposalCookieName(PROPOSAL_A)).toBe("nk_pa_11111111");
  });
});

describe("proposalCookieOptions", () => {
  it("is HttpOnly and lax — a WhatsApp link is a top-level GET", () => {
    const options = mod.proposalCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });
});
