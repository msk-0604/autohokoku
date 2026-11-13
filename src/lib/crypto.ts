import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, randomUUID } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const newId = () => randomUUID();

/** URL に載せられるランダムトークン（256bit） */
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) {
    // タイミング差でアカウントの有無が分からないようにダミー計算する
    await hashPassword(password);
    return false;
  }
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}
