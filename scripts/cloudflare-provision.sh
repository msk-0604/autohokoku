#!/usr/bin/env bash
# Cloudflare 本番環境の構築（D1・R2・Worker）。何度実行しても既存リソースは作り直さない。
#
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... ./scripts/cloudflare-provision.sh <step>
#
# step: check | d1 | r2 | config | migrate | secret | deploy | all
# - 既存の D1 / R2 があればそれを使う（削除・再作成はしない）
# - GATEWAY_SECRET は生成して Worker に直接登録し、画面やログには出さない。
#   Vercel に設定する値は $SECRET_FILE（既定: ~/.stark-report/gateway-secret、権限600）にだけ保存する
set -euo pipefail
cd "$(dirname "$0")/../workers/gateway"

DB_NAME="stark-report"
BUCKET="stark-report-files"
BACKUP_BUCKET="stark-report-backups"
SECRET_FILE="${SECRET_FILE:-$HOME/.stark-report/gateway-secret}"
export WRANGLER_SEND_METRICS=false
W="npx wrangler"

step_check() {
  $W whoami 2>&1 | grep -E "logged in|associated with|Account Name|Account ID|not authenticated" || true
}

d1_id() {
  $W d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const l=JSON.parse(s);const d=l.find(x=>x.name===process.argv[1]);process.stdout.write(d?d.uuid:"")})' "$DB_NAME"
}

step_d1() {
  local id; id="$(d1_id)"
  if [ -n "$id" ]; then echo "D1 '$DB_NAME' は既に存在します（再作成しません）: $id"; return; fi
  $W d1 create "$DB_NAME" --location=apac >/dev/null
  id="$(d1_id)"
  [ -n "$id" ] || { echo "D1 の作成を確認できませんでした" >&2; exit 1; }
  echo "D1 '$DB_NAME' を作成しました: $id"
}

bucket_exists() { $W r2 bucket list 2>/dev/null | grep -Eq "^name:\s+$1\s*$"; }

step_r2() {
  for b in "$BUCKET" "$BACKUP_BUCKET"; do
    if bucket_exists "$b"; then echo "R2 '$b' は既に存在します（再作成しません）"; else $W r2 bucket create "$b" --location=apac >/dev/null && echo "R2 '$b' を作成しました"; fi
  done
}

step_config() {
  local id; id="$(d1_id)"
  [ -n "$id" ] || { echo "D1 がありません。先に d1 を実行してください" >&2; exit 1; }
  sed -i -E "s/^database_id = \".*\"/database_id = \"$id\"/" wrangler.toml
  grep -n "database_id" wrangler.toml
}

step_migrate() {
  $W d1 migrations list "$DB_NAME" --remote
  $W d1 migrations apply "$DB_NAME" --remote
  $W d1 execute "$DB_NAME" --remote --json --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s)[0].results.map(x=>x.name);console.log("テーブル("+r.length+"): "+r.join(", "))})'
}

step_secret() {
  if $W secret list --format=json 2>/dev/null | grep -q '"GATEWAY_SECRET"'; then
    if [ -s "$SECRET_FILE" ]; then echo "GATEWAY_SECRET は登録済みです（再生成しません）"; return; fi
    echo "GATEWAY_SECRET は Worker に登録済みですが、手元の $SECRET_FILE がありません。" >&2
    echo "Vercel 側の値が分からない場合は ROTATE=1 を付けて再実行すると新しい値に置き換えます（Vercel 側も更新が必要）。" >&2
    [ "${ROTATE:-0}" = "1" ] || exit 1
  fi
  mkdir -p "$(dirname "$SECRET_FILE")"; chmod 700 "$(dirname "$SECRET_FILE")"
  umask 177
  openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-64 > "$SECRET_FILE"
  $W secret put GATEWAY_SECRET < "$SECRET_FILE" >/dev/null
  echo "GATEWAY_SECRET を生成して Worker に登録しました（値は $SECRET_FILE にのみ保存。表示しません）"
}

step_deploy() {
  $W deploy 2>&1 | grep -E "Uploaded|Published|Deployed|https://|Current Version|error" || true
}

case "${1:-}" in
  check) step_check ;;
  d1) step_d1 ;;
  r2) step_r2 ;;
  config) step_config ;;
  migrate) step_migrate ;;
  secret) step_secret ;;
  deploy) step_deploy ;;
  all) step_check; step_d1; step_r2; step_config; step_migrate; step_secret; step_deploy ;;
  *) echo "usage: $0 check|d1|r2|config|migrate|secret|deploy|all" >&2; exit 2 ;;
esac
