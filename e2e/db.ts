import { DatabaseSync } from "node:sqlite";

/** テスト用：E2E サーバーの SQLite を直接参照・更新する（テストの準備・検証のみに使う） */
const PATH = process.env.E2E_DB_PATH ?? ".data/e2e/db.sqlite";

export function sql<T = Record<string, unknown>>(query: string, ...params: (string | number | null)[]): T[] {
  const db = new DatabaseSync(PATH);
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    const stmt = db.prepare(query);
    if (/^\s*(select|with)/i.test(query)) return stmt.all(...params) as T[];
    stmt.run(...params);
    return [];
  } finally {
    db.close();
  }
}

export function orgIdByEmail(email: string): string {
  const rows = sql<{ org_id: string }>("SELECT m.org_id FROM memberships m JOIN users u ON u.id = m.user_id WHERE u.email = ?", email);
  if (!rows[0]) throw new Error(`org for ${email} not found`);
  return rows[0].org_id;
}
