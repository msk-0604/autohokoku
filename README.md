# Stark Report（仮称）— 写真付き作業報告書 SaaS

Stark Lab（個人事業主）が中小企業向けに提供する、写真付き作業報告書クラウドです。
スマートフォンで写真を撮り、作業内容を入力するだけで、A4の作業報告書PDFが完成し、そのままお客様へメール送信できます。
月額7,480円（税込）・初期費用0円・14日間無料体験。

## 技術構成

- Next.js 16（App Router）/ TypeScript / Tailwind CSS v4 / Lucide React / Zod
- Drizzle ORM（SQLite 方言）
  - 本番：Cloudflare D1 + R2（`workers/gateway` の Worker 経由。認証情報は Worker 側のみ）
  - 開発・テスト：Node 組み込みの `node:sqlite` とローカルディスク
- PDF：`@react-pdf/renderer` + Noto Sans JP（`assets/fonts`、SIL OFL）
- メール：Resend（開発時は `.data/outbox` に出力のみ）
- 決済：Stripe Checkout / Billing / Customer Portal / Webhook
- ホスティング：Vercel（Cron 含む）
- E2E テスト：Playwright

## ローカル開発

```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run db:migrate
```
```bash
npm run db:seed
```
```bash
npm run dev
```

http://localhost:3000 → デモアカウント `demo@example.com` / `demo-pass-2026`
開発中のメールは送信されず `.data/outbox/*.json` に保存されます（確認メールのリンクもここから開けます）。
運営管理画面を見るには `npx tsx scripts/make-admin.ts <email>` → http://localhost:3000/ops

## テスト

```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm run test:e2e
```

E2E は専用の DB・保存先（`.data/e2e`）で開発サーバーを起動して実行します。主なテスト：

| ファイル | 内容 |
| --- | --- |
| `e2e/core-flow.spec.ts` | 登録→無料体験→顧客・現場→写真撮影→報告書→確定→日本語PDF |
| `e2e/security.spec.ts` | 他社データへのアクセス拒否、未ログイン拒否、CSRF、XSS、アップロード制限 |
| `e2e/email.spec.ts` | 確認画面付きの顧客送信、初回宛先の確認、期限付きリンク、失敗と再送 |
| `e2e/billing.spec.ts` | Stripe Webhook の署名検証・冪等性・順序逆転・解約時の書き込み拒否、体験終了の自動処理 |
| `e2e/ops-and-misc.spec.ts` | 運営画面の権限、パスワード再設定、メンバー招待と権限、LP・SEO・問い合わせ |

## ディレクトリ

```
src/app/(marketing)   LP・FAQ・お問い合わせ・規約
src/app/(auth)        登録・ログイン・メール確認・パスワード再設定
src/app/app           顧客向け管理画面（/app）
src/app/ops           Stark Lab 運営管理画面（/ops、運営者以外は404）
src/app/api           写真・PDF・Stripe Webhook・Cron
src/lib               DB・認証・権限・ストレージ・メール・PDF・課金
workers/gateway       D1/R2 ゲートウェイ（Cloudflare Worker）
drizzle               マイグレーション SQL（D1 と共通）
scripts               マイグレーション・デモデータ・Stripe 初期設定・バックアップ
```

## セキュリティ設計の要点

- すべてのデータ取得・更新で `org_id` をサーバー側の条件に含める（`src/lib/data`, 各 Server Action）。他社IDを指定しても 404
- 写真・ロゴ・PDF は認証付きの API 経由でのみ配信（R2 は非公開）。メール用のリンクはハッシュ化した期限付きトークン
- セッションは HttpOnly / SameSite=Lax cookie。DB にはトークンのハッシュのみ保存
- パスワードは scrypt。ログイン・登録・送信・アップロード等に DB ベースのレート制限
- Server Actions は Next.js の Origin 検査、Route Handler は独自の Origin 検査（CSRF 対策）
- アップロードはサイズ上限とファイル先頭バイトでの形式判定（JPEG/PNG のみ）
- 主要な操作は `audit_logs` に記録。エラーは `system_errors` に記録し、重大なものは運営者にメール
- 契約が無効な会社はサーバー側で書き込み拒否（閲覧・PDFは可能）

## 本番公開

[docs/SETUP.md](docs/SETUP.md) を参照（Cloudflare / Stripe / Resend / Vercel / バックアップ / チェックリスト）。

## AIチャットサポートの追加について

現在は AI API を使っていません（費用ゼロ）。追加する場合は `src/lib/support.ts` の問い合わせ受付と同じ場所に、
`FAQ`・`GUIDE`（`src/lib/content.ts`）を参照する回答処理を追加し、解決しなかった質問を `support_requests` に保存する構成を想定しています。
