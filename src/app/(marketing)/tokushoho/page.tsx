import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../legal";
import { COMPANY_NAME, CONTACT_EMAIL, OWNER_NAME, PRICE_MONTHLY_TAX_INCLUDED, SERVICE_NAME, TRIAL_DAYS } from "@/lib/brand";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", alternates: { canonical: "/tokushoho" } };

const price = PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP");
const contact = (
  <>
    {CONTACT_EMAIL ? <>{CONTACT_EMAIL}<br /></> : null}
    <Link href="/contact" className="text-brand-700 underline">
      お問い合わせフォーム
    </Link>
    よりご連絡ください。
  </>
);

const rows: [string, React.ReactNode][] = [
  ["販売事業者", `${OWNER_NAME}（屋号：${COMPANY_NAME}）`],
  ["運営責任者", OWNER_NAME],
  ["所在地", "ご請求があった場合、遅滞なく開示いたします。"],
  ["電話番号", "ご請求があった場合、遅滞なく開示いたします。"],
  ["お問い合わせ先", contact],
  ["サービス名", SERVICE_NAME],
  ["販売価格", `スタンダードプラン 月額${price}円（税込）。初期費用はかかりません。`],
  ["商品代金以外に必要な料金", "インターネット接続に必要な通信料金はお客様のご負担となります。"],
  ["お支払い方法", "クレジットカード（決済代行：Stripe）"],
  [
    "お支払い時期",
    `${TRIAL_DAYS}日間の無料体験中にお申し込みいただいた場合は、無料体験の終了日に初回の決済が行われます。無料体験終了後にお申し込みいただいた場合は、お申し込み時に初回の決済が行われます。以降は1か月ごとに自動で決済されます。`,
  ],
  ["サービスの提供時期", "お申し込み手続きの完了後、直ちにご利用いただけます。"],
  [
    "契約期間・自動更新",
    "1か月ごとの自動更新です。解約のお手続きがない限り、同じ内容で自動的に更新されます。無料体験のみのご利用で、自動的に課金されることはありません。",
  ],
  [
    "解約方法",
    "管理画面の「契約・お支払い」→「お支払い方法・領収書・解約」から、いつでもお手続きいただけます。解約後も、お支払い済みの期間の末日までご利用いただけます。",
  ],
  ["返金", "サービスの性質上、お支払い済みの料金の返金（日割りを含む）はいたしかねます。"],
  ["動作環境", "最新版の Safari（iPhone・iPad）、Google Chrome（Android・Windows・Mac）、Microsoft Edge"],
];

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updated="2026年11月23日" draft={false}>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-200">
              <th className="w-1/3 bg-slate-50 p-3 text-left align-top font-bold text-navy-900">{k}</th>
              <td className="p-3 leading-relaxed">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalPage>
  );
}
