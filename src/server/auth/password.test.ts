import { describe, expect, it } from "vitest";
import { hashPassword, normalizePassword, verifyPassword } from "@/server/auth/password";

/* Passwords and time — ADR 12, as amended by ADR 27. This is the passwords half.

   scrypt at N=16384 costs real milliseconds by design, so this file is slower
   than the rest of the suite. That is the feature being tested. */

describe("hashPassword / verifyPassword", () => {
  it("round-trips", async () => {
    const stored = await hashPassword("proposta-2026");
    expect(await verifyPassword("proposta-2026", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("proposta-2026");
    expect(await verifyPassword("proposta-2027", stored)).toBe(false);
  });

  it("is salted: the same password hashes differently every time", async () => {
    const a = await hashPassword("mesma-senha");
    const b = await hashPassword("mesma-senha");
    expect(a).not.toBe(b);
    expect(await verifyPassword("mesma-senha", a)).toBe(true);
    expect(await verifyPassword("mesma-senha", b)).toBe(true);
  });

  it("encodes its own parameters, so raising the cost later is not a flag day", async () => {
    const stored = await hashPassword("x");
    const [scheme, n, r, p] = stored.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(n)).toBe(16384);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });

  /* The bug this prevents is invisible in a code review and in a bug report:
     the client types the password on an iPhone, it does not match, and both
     sides are looking at the same characters on screen. */
  it("matches the same grapheme typed as composed or decomposed", async () => {
    const composed = "senção";
    const decomposed = "senção";
    expect(composed).not.toBe(decomposed);
    expect(normalizePassword(composed)).toBe(normalizePassword(decomposed));

    const stored = await hashPassword(composed);
    expect(await verifyPassword(decomposed, stored)).toBe(true);
  });
});

describe("verifyPassword does not throw on hostile input", () => {
  /* Every one of these returns false rather than raising. A malformed row must
     fail the login, not 500 the request — and `timingSafeEqual` throws on a
     length mismatch, which is exactly what a truncated hash produces. */
  const garbage = [
    "",
    "not-a-hash",
    "scrypt$16384$8$1$onlyfiveparts",
    "scrypt$16384$8$1$c2FsdA$", // empty hash
    "scrypt$16384$8$1$$aGFzaA", // empty salt
    "bcrypt$16384$8$1$c2FsdA$aGFzaGhhc2hoYXNoaGFzaA", // wrong scheme
    "scrypt$abc$8$1$c2FsdA$aGFzaGhhc2hoYXNoaGFzaA", // non-numeric cost
  ];

  for (const stored of garbage) {
    it(`returns false for ${JSON.stringify(stored.slice(0, 32))}`, async () => {
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    });
  }

  /* A cost parameter read back from a row is attacker-influenced the moment
     anything but us can write that column. N = 2^30 is a denial of service with
     a straight face, so it is rejected before it reaches scrypt. */
  it("rejects an absurd cost parameter instead of trying to honour it", async () => {
    const absurd = `scrypt$${2 ** 30}$8$1$c2FsdA$aGFzaGhhc2hoYXNoaGFzaA`;
    await expect(verifyPassword("anything", absurd)).resolves.toBe(false);
  });
});

/* NOT TESTED, deliberately: that the comparison takes constant wall-clock time.
   docs/testing.md asks for "comparison is timing-safe", and a timing assertion
   in a unit test is flaky under CI load — it would be deleted within a month and
   would have proven nothing while it lived. What is asserted instead is the
   observable consequence: a length mismatch returns false rather than throwing,
   which is the failure mode that would leak the length. The constant-time
   property itself comes from `timingSafeEqual`, which is the reason to use it. */
