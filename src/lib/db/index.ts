import "server-only";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { env } from "@/lib/env";
import type { QueryMethod, RemoteBatchItem, RemoteDriver } from "./types";

export type DB = SqliteRemoteDatabase<typeof schema>;

/**
 * DB ドライバ
 * - worker: Cloudflare Worker（D1 バインディング）経由。本番用。D1 の認証情報は Worker 側にだけ存在する
 * - sqlite: ローカル開発・E2E テスト用（Node 組み込みの node:sqlite）
 */
async function createDriver(): Promise<RemoteDriver> {
  if (env.DB_DRIVER === "sqlite") {
    const { createSqliteDriver } = await import("./driver-sqlite");
    return createSqliteDriver(env.DATABASE_PATH);
  }
  const { createWorkerDriver } = await import("./driver-worker");
  return createWorkerDriver(env.GATEWAY_URL, env.GATEWAY_SECRET);
}

const g = globalThis as unknown as { __db?: DB; __driver?: Promise<RemoteDriver> };

function driver() {
  if (!g.__driver) g.__driver = createDriver();
  return g.__driver;
}

export const db: DB =
  g.__db ??
  (g.__db = drizzle(
    async (sql: string, params: unknown[], method: QueryMethod) => (await driver()).query(sql, params, method),
    async (queries: RemoteBatchItem[]) => (await driver()).batch(queries),
    { schema },
  ));

export { schema };
