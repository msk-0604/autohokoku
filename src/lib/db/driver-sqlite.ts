import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { QueryMethod, RemoteBatchItem, RemoteDriver } from "./types";

function normalize(params: unknown[]): SQLInputValue[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.getTime();
    return p as SQLInputValue;
  });
}

export function openSqlite(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  return database;
}

export function createSqliteDriver(path: string): RemoteDriver {
  const database = openSqlite(path);

  const exec = (sql: string, params: unknown[], method: QueryMethod) => {
    const stmt = database.prepare(sql);
    const p = normalize(params);
    if (method === "run") {
      stmt.run(...p);
      return { rows: [] as unknown[] };
    }
    stmt.setReturnArrays(true);
    if (method === "get") {
      return { rows: (stmt.get(...p) as unknown[] | undefined) as unknown as unknown[] };
    }
    return { rows: stmt.all(...p) as unknown[] };
  };

  return {
    async query(sql, params, method) {
      return exec(sql, params, method);
    },
    async batch(queries: RemoteBatchItem[]) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const out = queries.map((q) => exec(q.sql, q.params, q.method));
        database.exec("COMMIT");
        return out;
      } catch (e) {
        database.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
