#!/usr/bin/env bash
# D1 の論理バックアップ（SQL ダンプ）を取得し、R2 のバックアップ用バケットに保存する。
#   CLOUDFLARE_API_TOKEN=... ./scripts/backup-d1.sh
# GitHub Actions（.github/workflows/backup.yml）から毎日実行される。
# ※ D1 には Time Travel（過去30日の任意時点への復元）もあり、通常の復元はそちらを使う。
set -euo pipefail
cd "$(dirname "$0")/../workers/gateway"

DB_NAME="${D1_DATABASE_NAME:-stark-report}"
BUCKET="${BACKUP_BUCKET:-stark-report-backups}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="/tmp/${DB_NAME}-${STAMP}.sql"

npx wrangler d1 export "$DB_NAME" --remote --output="$FILE"
gzip -9 "$FILE"
npx wrangler r2 object put "${BUCKET}/d1/${DB_NAME}-${STAMP}.sql.gz" --file="${FILE}.gz" --remote
echo "backup saved: ${BUCKET}/d1/${DB_NAME}-${STAMP}.sql.gz"
