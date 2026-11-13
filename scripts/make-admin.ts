/**
 * 運営者（Stark Lab）権限をローカル SQLite のユーザーに付与する。
 *   npx tsx scripts/make-admin.ts you@example.com
 * 本番 D1 では次を実行する（docs/SETUP.md 参照）:
 *   cd workers/gateway && npx wrangler d1 execute stark-report --remote --command "UPDATE users SET is_platform_admin = 1 WHERE email = 'you@example.com'"
 */
import { openSqlite } from "../src/lib/db/driver-sqlite";

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("使い方: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}
const db = openSqlite(process.env.DATABASE_PATH ?? ".data/dev.sqlite");
const r = db.prepare("UPDATE users SET is_platform_admin = 1 WHERE email = ?").run(email);
console.log(r.changes ? `${email} を運営者にしました` : `${email} が見つかりません`);
