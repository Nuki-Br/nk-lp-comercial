import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/* Proposal password hashing. ADR 14: node:crypto, no bcrypt, no argon2.
   Design and rationale in docs/security.md. */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;

/* N=16384, r=8 needs 128 * N * r = 16 MiB. Node's default ceiling is 32 MiB,
   which is close enough that concurrent verifications trip
   ERR_CRYPTO_INVALID_SCRYPT_PARAMS — an error that reads like a bug in the
   caller and is not. Set it explicitly and stop thinking about it. */
const MAXMEM = 64 * 1024 * 1024;

/** NFKC, on both sides of the hash.

    Without it an accented character typed on iOS does not match the same
    character typed on macOS: they are the same grapheme and different bytes.
    The failure is invisible to the salesperson, to the client, and to the logs. */
export const normalizePassword = (input: string): string => input.normalize("NFKC");

/** `scrypt$N$r$p$salt$hash`, all base64url.

    Self-describing on purpose: a hash carries the parameters it was made with,
    so raising N later is a new default rather than a flag day. Old hashes keep
    verifying against their own cost. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(normalizePassword(plain), salt, KEY_BYTES, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });

  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

type ParsedHash = { n: number; r: number; p: number; salt: Buffer; hash: Buffer };

/** Never throws. A malformed row must fail the login, not 500 the request. */
function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return null;

  /* Bounds, not preferences. These parameters are attacker-influenced the moment
     a hash column is writable by anything but us, and `N = 2^30` is a denial of
     service with a straight face. */
  if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return null;

  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  if (salt.length === 0 || hash.length < 16 || hash.length > 256) return null;

  return { n, r, p, salt, hash };
}

/**
 * Constant-time verify.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself be a timing
 * signal — so the derived key is requested at exactly the stored length and the
 * two are equal by construction.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  const key = await scrypt(normalizePassword(plain), parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAXMEM,
  });

  return timingSafeEqual(key, parsed.hash);
}
