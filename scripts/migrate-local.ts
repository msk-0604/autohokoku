/**
 * ローカル SQLite に drizzle/*.sql を順番に適用する。
 * 適用済み管理テーブル名は wrangler と同じ d1_migrations。
 *   npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openSqlite } from "../src/lib/db/driver-sqlite";

const path = process.env.DATABASE_PATH ?? ".data/dev.sqlite";
const db = openSqlite(path);
db.exec(
  "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
);
const applied = new Set(
  (db.prepare("SELECT name FROM d1_migrations").all() as { name: string }[]).map((r) => r.name),
);
const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
let count = 0;
for (const f of files) {
  if (applied.has(f)) continue;
  const sql = readFileSync(join("drizzle", f), "utf8");
  db.exec("BEGIN");
  try {
    for (const stmt of sql.split("--> statement-breakpoint")) {
      if (stmt.trim()) db.exec(stmt);
    }
    db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").run(f);
    db.exec("COMMIT");
    count++;
    console.log(`applied ${f}`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
console.log(`migrations done (${count} applied) -> ${path}`);
