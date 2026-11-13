# 本番公開の手順（Cloudflare / Stripe / Resend / Vercel）

構成：

```
ブラウザ ──▶ Vercel（Next.js：画面・API・PDF生成・Cron）
                 │  Bearer GATEWAY_SECRET（サーバー間通信のみ）
                 ▼
            Cloudflare Worker（workers/gateway）──▶ D1（DB） / R2（写真・ロゴ）
```

D1 と R2 の認証情報は Worker のバインディングにだけ存在し、Vercel にもブラウザにも渡りません。
Vercel が持つのは Worker を呼ぶための共有シークレット（`GATEWAY_SECRET`）だけです。

---

## 1. Cloudflare の設定

1. Cloudflare にログインし、ターミナルで `cd workers/gateway && npm install && npx wrangler login`
2. D1 データベースを作成
   ```bash
   npx wrangler d1 create stark-report
   ```
   表示された `database_id` を `workers/gateway/wrangler.toml` の `REPLACE_WITH_D1_DATABASE_ID` と置き換える
3. R2 バケットを作成（写真用とバックアップ用）
   ```bash
   npx wrangler r2 bucket create stark-report-files
   ```
   ```bash
   npx wrangler r2 bucket create stark-report-backups
   ```
4. テーブルを作成（`drizzle/` のマイグレーションを適用）
   ```bash
   npx wrangler d1 migrations apply stark-report --remote
   ```
5. 共有シークレットを設定（32文字以上のランダム文字列。`openssl rand -base64 48` などで作成）
   ```bash
   npx wrangler secret put GATEWAY_SECRET
   ```
6. デプロイ
   ```bash
   npx wrangler deploy
   ```
   表示された `https://stark-report-gateway.<アカウント>.workers.dev` を Vercel の `GATEWAY_URL` に設定する
7. 運営者アカウントの権限付与（本番で自分のアカウントを登録した後）
   ```bash
   npx wrangler d1 execute stark-report --remote --command "UPDATE users SET is_platform_admin = 1 WHERE email = 'you@starklab.jp'"
   ```

> R2 バケットは公開設定にしないでください（写真は必ずアプリの権限確認を経由して配信します）。

### データベースのスキーマ変更
`src/lib/db/schema.ts` を変更 → `npm run db:generate` → `cd workers/gateway && npx wrangler d1 migrations apply stark-report --remote`

---

## 2. Stripe の設定（まずテストモードで）

1. Stripe ダッシュボードを **テストモード** にし、「開発者 → APIキー」でシークレットキー（`sk_test_...`）をコピー
2. 商品・価格・カスタマーポータル・Webhook をまとめて作成
   ```bash
   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe-setup.ts https://<本番ドメイン>
   ```
   出力された `STRIPE_PRICE_ID` と `STRIPE_WEBHOOK_SECRET` を Vercel に設定
3. ダッシュボード「設定 → Billing → カスタマーポータル」で、作成された設定が有効になっていることを確認（解約・支払い方法変更・請求履歴）
4. 税の扱い：価格は **税込（inclusive）7,480円** で作成されます。
   - Stripe Tax を使う場合：「設定 → 税金」で日本の登録（適格請求書発行事業者番号）を行い、`STRIPE_AUTOMATIC_TAX=true`。税込価格のまま内訳（うち消費税680円）が請求書に表示されます。
   - 使わない場合：`STRIPE_AUTOMATIC_TAX=false`（請求額は 7,480円）
5. 「設定 → メール」で「支払い失敗」「カード期限切れ」のお客様向けメールを有効化（アプリ側からも通知します）
6. 「設定 → Billing → サブスクリプション → 未払いの管理」で、再試行（Smart Retries）と、最終的に失敗した場合は **サブスクリプションをキャンセル** に設定
7. テスト決済：アプリで新規登録 → 「契約・お支払い」→「有料プランに申し込む」→ カード `4242 4242 4242 4242`（有効期限は未来、CVC任意）→ 「ご契約中」になることを確認 → 「お支払い方法・領収書・解約」から解約 → 期間終了で「解約済み」になることを確認
   - 期間終了を待たずに確認する場合は、Stripe ダッシュボードでサブスクリプションを「今すぐキャンセル」
   - Webhook の受信状況はダッシュボード「開発者 → Webhook」で確認できます

**本番決済への切り替え**（事業者確認が済んでから）：本番モードで手順2を `--live` 付きで実行し、本番のキー・価格ID・Webhookシークレットに差し替え、`STRIPE_LIVE_MODE_CONFIRMED=true` を設定。このフラグがないと本番キーではアプリが決済処理を行いません。

---

## 3. Resend の設定

1. Resend にサインアップし「Domains → Add Domain」で送信用ドメイン（例 `mail.starklab.jp`）を追加
2. 表示された DNS レコード（SPF・DKIM・MX）をドメインの DNS に登録し、Verified になるまで待つ
3. DMARC レコードも設定（例 `v=DMARC1; p=none; rua=mailto:dmarc@starklab.jp`）
4. 「API Keys」で送信権限のキーを作成し、Vercel に `RESEND_API_KEY`
5. `EMAIL_DRIVER=resend`、`EMAIL_FROM="Stark Report <no-reply@mail.starklab.jp>"`
6. 実送信テスト：自分のアドレスで新規登録し、確認メールが届くことを確認（迷惑メールに入らないかも確認）

> お客様への報告書メールの「返信先」は、各社が「会社設定」で登録したメールアドレスになります。

---

## 4. Vercel へのデプロイ

1. Vercel で「Add New → Project」から GitHub の `msk-0604/autohokoku` をインポート（Framework: Next.js、Node.js 22）
2. 「Settings → Environment Variables」に `.env.example` の値を設定（Production）
   - 必須：`APP_URL` `DB_DRIVER=worker` `STORAGE_DRIVER=worker` `GATEWAY_URL` `GATEWAY_SECRET` `EMAIL_DRIVER=resend` `RESEND_API_KEY` `EMAIL_FROM` `STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` `STRIPE_PRICE_ID` `CRON_SECRET` `ADMIN_ALERT_EMAIL`
3. デプロイ後、独自ドメインを「Settings → Domains」で設定し、`APP_URL` をそのドメインにして再デプロイ
4. Cron：`vercel.json` で毎日 9:00（JST）に `/api/cron/daily` が実行されます（Vercel が `CRON_SECRET` を自動付与）。「Settings → Cron Jobs」で実行履歴を確認できます
5. リージョンは東京（`hnd1`）に設定済み
6. Google Analytics 4：測定IDを `NEXT_PUBLIC_GA_ID` に設定
7. Google Search Console：「URLプレフィックス」で登録 →「HTMLタグ」の content 値を `NEXT_PUBLIC_GSC_VERIFICATION` に設定して再デプロイ → 確認後 `https://<ドメイン>/sitemap.xml` を送信

---

## 5. バックアップと復元

| 方法 | 内容 | 復元 |
| --- | --- | --- |
| D1 Time Travel（自動） | 過去30日の任意の時点に戻せる | `npx wrangler d1 time-travel restore stark-report --timestamp=2026-11-20T09:00:00+09:00` |
| 日次エクスポート | `.github/workflows/backup.yml` が毎日 SQL ダンプを R2（`stark-report-backups`）に保存 | 下記 |
| 写真（R2） | R2 は複数拠点に冗長保存される。誤削除対策が必要ならバケットのライフサイクル／別バケットへの定期コピーを設定 | — |

GitHub リポジトリの Secrets に `CLOUDFLARE_API_TOKEN`（D1 編集・R2 書き込み権限）と `CLOUDFLARE_ACCOUNT_ID` を設定すると日次バックアップが動きます。

**ダンプからの復元手順**（新しいDBに復元して確認してから切り替える）：
```bash
npx wrangler r2 object get stark-report-backups/d1/<ファイル名>.sql.gz --file=restore.sql.gz --remote
```
```bash
gunzip restore.sql.gz
```
```bash
npx wrangler d1 create stark-report-restore
```
```bash
npx wrangler d1 execute stark-report-restore --remote --file=restore.sql
```
内容を確認したら `wrangler.toml` の `database_id` を復元先に変更して `npx wrangler deploy`。

月に1回は復元手順を試し、手順が有効であることを確認してください。

---

## 6. 本番公開前チェックリスト

- [ ] 特定商取引法の表記（住所・電話・責任者）、利用規約、プライバシーポリシーを確定版に差し替え（`src/app/(marketing)/`）
- [ ] サービスの正式名称を決め、`src/lib/brand.ts` を変更（仮称：Stark Report）
- [ ] Stripe テストモードで申込→更新→支払い失敗→解約までを確認（テストクロックを使うと月次更新も確認可能）
- [ ] Resend のドメイン認証・迷惑メール判定の確認
- [ ] 運営者アカウントに `is_platform_admin` を付与し `/ops` を確認
- [ ] `ADMIN_ALERT_EMAIL` に届く監視メールの確認（`/api/cron/daily` を手動実行）
- [ ] バックアップの GitHub Actions が成功していることを確認
- [ ] iPhone（Safari）・Android（Chrome）の実機で撮影→PDF→送信を確認
