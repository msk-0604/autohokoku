import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { env } from "@/lib/env";

/**
 * 写真・ロゴの保存先
 * - worker: Cloudflare Worker 経由で R2 に保存（本番）。R2 の認証情報は Worker 側のみ
 * - local : ローカルディスク（開発・テスト）
 * キーは必ず `orgs/<orgId>/...` で始まる。呼び出し側で企業IDを検証済みであること。
 */
export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

const KEY_RE = /^orgs\/[0-9a-f-]{36}\/[A-Za-z0-9/_.-]+$/;

function assertKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..")) throw new Error("不正なストレージキーです");
}

function localPath(key: string) {
  const root = resolve(env.LOCAL_STORAGE_DIR);
  const p = resolve(join(root, key));
  if (!p.startsWith(root + sep)) throw new Error("不正なストレージキーです");
  return p;
}

async function gateway(path: string, init: RequestInit) {
  if (!env.GATEWAY_URL || !env.GATEWAY_SECRET) throw new Error("GATEWAY_URL / GATEWAY_SECRET が設定されていません");
  return fetch(new URL(path, env.GATEWAY_URL), {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${env.GATEWAY_SECRET}` },
    cache: "no-store",
  });
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  assertKey(key);
  if (env.STORAGE_DRIVER === "local") {
    const p = localPath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    await writeFile(p + ".meta", contentType);
    return;
  }
  const res = await gateway(`/r2/${key}`, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: Buffer.from(body),
  });
  if (!res.ok) throw new Error(`R2 put failed: ${res.status} ${await res.text()}`);
}

export async function getObject(key: string): Promise<StoredObject | null> {
  assertKey(key);
  if (env.STORAGE_DRIVER === "local") {
    try {
      const p = localPath(key);
      const [body, ct] = await Promise.all([readFile(p), readFile(p + ".meta", "utf8").catch(() => "application/octet-stream")]);
      return { body: new Uint8Array(body), contentType: ct };
    } catch {
      return null;
    }
  }
  const res = await gateway(`/r2/${key}`, { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 get failed: ${res.status}`);
  return {
    body: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function deleteObject(key: string): Promise<void> {
  assertKey(key);
  if (env.STORAGE_DRIVER === "local") {
    const p = localPath(key);
    await Promise.all([unlink(p).catch(() => {}), unlink(p + ".meta").catch(() => {})]);
    return;
  }
  const res = await gateway(`/r2/${key}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}

/** 先頭バイトから画像形式を判定する（Content-Type や拡張子は信用しない） */
export function sniffImageType(buf: Uint8Array): "image/jpeg" | "image/png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";
  return null;
}
