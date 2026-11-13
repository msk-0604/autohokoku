import type { Metadata } from "next";
import { LegalPage } from "../legal";
import { COMPANY_NAME, PRICE_MONTHLY_TAX_INCLUDED, SERVICE_NAME, TRIAL_DAYS } from "@/lib/brand";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", alternates: { canonical: "/tokushoho" } };

const rows: [string, string][] = [
  ["販売事業者", COMPANY_NAME],
  ["運営責任者", "（公開前に記載）"],
  ["所在地", "（公開前に記載）※ 請求があった場合に遅滞なく開示する運用とする場合はその旨を記載"],
  ["電話番号", "（公開前に記載）※ 同上"],
  ["メールアドレス", "（公開前に記載）"],
  ["販売価格", `${SERVICE_NAME} スタンダードプラン 月額${PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP")}円（税込）`],
  ["商品代金以外の必要料金", "インターネット接続に必要な通信料金はお客様のご負担となります。"],
  ["お支払い方法", "クレジットカード（Stripe）"],
  ["お支払い時期", `${TRIAL_DAYS}日間の無料体験終了後、お申し込み時に初回決済。以降は毎月同日に自動決済されます。`],
  ["サービスの提供時期", "お申し込み手続き完了後、直ちにご利用いただけます。"],
  ["解約・返金", "管理画面からいつでも解約できます。解約後も当該契約期間の末日までご利用いただけます。日割りでの返金は行いません。"],
  ["動作環境", "最新版の Safari（iOS）、Google Chrome（Android・Windows・macOS）、Microsoft Edge"],
];

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updated="2026年11月13日">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-200">
              <th className="w-1/3 bg-slate-50 p-3 text-left align-top font-bold text-navy-900">{k}</th>
              <td className="p-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalPage>
  );
}
