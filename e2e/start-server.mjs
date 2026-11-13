// E2E 用サーバー起動：テスト用データを初期化 → マイグレーション → next dev
import { rmSync } from "node:fs";
import { spawn, execSync } from "node:child_process";

const dir = ".data/e2e";
rmSync(dir, { recursive: true, force: true });
execSync("npx tsx scripts/migrate-local.ts", { stdio: "inherit", env: process.env });
const child = spawn("npx", ["next", "dev", "-p", process.env.PORT ?? "3100"], { stdio: "inherit", env: process.env });
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code ?? 0));
