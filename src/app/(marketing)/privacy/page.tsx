import type { Metadata } from "next";
import { LegalPage } from "../legal";
import { COMPANY_NAME, SERVICE_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "プライバシーポリシー", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated="2026年11月13日">
      <p>{COMPANY_NAME}（以下「当社」）は、「{SERVICE_NAME}」における個人情報を、個人情報保護法その他の法令に従い適切に取り扱います。</p>
      <h2>1. 取得する情報</h2>
      <ul>
        <li>登録情報：会社名、氏名、メールアドレス、住所、電話番号</li>
        <li>利用者が登録するデータ：報告書、写真、顧客・現場情報</li>
        <li>利用状況：アクセスログ、IPアドレス、ブラウザ情報、Cookie</li>
        <li>決済情報：決済は Stripe, Inc. が処理し、当社はカード番号を保持しません</li>
      </ul>
      <h2>2. 利用目的</h2>
      <ul>
        <li>本サービスの提供・本人確認・お問い合わせ対応</li>
        <li>料金の請求、契約状態に関するご連絡</li>
        <li>不正利用の防止、障害対応、サービス改善</li>
      </ul>
      <h2>3. 第三者提供・委託</h2>
      <p>
        法令に基づく場合を除き、本人の同意なく第三者に提供しません。サービス提供のため、以下の事業者にデータの処理を委託します：Cloudflare, Inc.（データベース・写真保存）、Vercel
        Inc.（ホスティング）、Stripe, Inc.（決済）、Resend（メール送信）、Google LLC（アクセス解析）。
      </p>
      <h2>4. 安全管理</h2>
      <p>通信の暗号化、会社ごとのデータ分離、アクセス権限の確認、操作記録の保存などにより、情報を安全に管理します。</p>
      <h2>5. 開示・訂正・削除</h2>
      <p>ご本人からの開示・訂正・利用停止・削除のご請求には、本人確認のうえ法令に従い対応します。お問い合わせフォームからご連絡ください。</p>
      <h2>6. アクセス解析</h2>
      <p>当社サイトでは Google アナリティクスを利用する場合があります。Cookie により匿名の利用状況を収集します。</p>
      <h2>7. 改定</h2>
      <p>本ポリシーは必要に応じて改定し、本ページで公表します。</p>
    </LegalPage>
  );
}
