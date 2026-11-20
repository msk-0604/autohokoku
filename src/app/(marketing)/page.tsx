import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  FileText,
  Send,
  Tags,
  Smartphone,
  Clock,
  ShieldCheck,
  Check,
  HardHat,
  Zap,
  Wind,
  Sparkles,
  Wrench,
  Hammer,
  Building,
  ArrowRight,
  FolderOpen,
  History,
} from "lucide-react";
import { buttonClass } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { FAQ } from "@/lib/content";
import { COMPANY_NAME, PRICE_MONTHLY_TAX_INCLUDED, SERVICE_NAME, TRIAL_DAYS } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${SERVICE_NAME}｜スマホで写真付き作業報告書を数分で作成・PDF出力・メール送信` },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SERVICE_NAME,
    title: `${SERVICE_NAME}｜写真付き作業報告書をスマホで数分`,
    description: `現場で写真を撮って入力するだけ。A4の作業報告書PDFが自動で完成し、そのままお客様へメール送信。月額${PRICE_MONTHLY_TAX_INCLUDED.toLocaleString()}円（税込）・${TRIAL_DAYS}日間無料体験。`,
  },
  twitter: { card: "summary_large_image" },
};

const price = PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP");

const FEATURES = [
  { icon: Camera, title: "スマホで撮影、そのまま登録", body: "カメラを起動して撮るだけ。写真は自動で圧縮されるので、現場の電波でもすばやくアップロードできます。" },
  { icon: Tags, title: "作業前・作業中・作業後を分類", body: "写真ごとに分類とコメントを付けられます。よく使う言葉はボタンで入力でき、文字入力を最小限にできます。" },
  { icon: FileText, title: "きれいなA4報告書PDFを自動作成", body: "会社ロゴ・顧客名・現場名・作業内容・写真を自動でレイアウト。写真が多いときは自動で改ページします。" },
  { icon: Send, title: "お客様へそのままメール送信", body: "完成した報告書を、アプリから直接お客様に送れます。期限付きの安全なリンクまたはPDF添付を選べ、送信履歴も残ります。" },
  { icon: History, title: "修正履歴を自動で記録", body: "確定後に修正すると、新しい版として保存されます。いつ・誰が・何を変えたかを後から確認できます。" },
  { icon: FolderOpen, title: "顧客・現場ごとに整理", body: "顧客と現場を登録しておけば、過去の報告書をすぐに探せます。番号・顧客名・内容で検索もできます。" },
];

const STEPS = [
  { icon: Camera, title: "撮る", body: "現場でスマホのカメラを起動し、作業前・作業後の写真を撮影します。" },
  { icon: Smartphone, title: "入力する", body: "作業内容や使用材料を入力。定型文ボタンで入力の手間を減らせます。" },
  { icon: Send, title: "送る", body: "「確定」で報告書PDFが完成。その場でお客様にメール送信できます。" },
];

const MERITS = [
  { icon: Clock, title: "事務所に戻ってからの作業を減らせる", body: "写真の取り込み・整理・貼り付けといった報告書作成の手作業を、現場で完結できます。" },
  { icon: FileText, title: "誰が作っても同じ品質の報告書に", body: "レイアウトが統一されるので、担当者によって見栄えがばらつきません。" },
  { icon: ShieldCheck, title: "写真と報告書を安全に保管", body: "データは会社ごとに分離して保管。スマホの紛失や機種変更でも写真が消える心配がありません。" },
  { icon: Send, title: "送付漏れ・送付先の間違いを防ぐ", body: "送信履歴が残り、初めての宛先には確認操作が入るので、誤送信を防げます。" },
];

const INDUSTRIES = [
  { icon: HardHat, label: "建設業" },
  { icon: Zap, label: "電気工事業" },
  { icon: Wind, label: "空調・設備工事業" },
  { icon: Sparkles, label: "清掃業" },
  { icon: Wrench, label: "修理・メンテナンス業" },
  { icon: Hammer, label: "リフォーム業" },
  { icon: Building, label: "その他、写真付きの報告が必要な業種" },
];

function Cta({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Link href="/signup" className={buttonClass("primary", "lg", "h-14 px-8 text-lg shadow-lg shadow-brand-600/20")}>
        {TRIAL_DAYS}日間 無料で試す <ArrowRight className="size-5" />
      </Link>
      <p className="mt-3 text-sm text-slate-500">クレジットカード登録不要・自動課金なし</p>
    </div>
  );
}

export default function LandingPage() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SERVICE_NAME,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web, iOS, Android",
            description: "スマートフォンで写真を撮って入力するだけで、写真付き作業報告書PDFを作成・送信できるクラウドサービス。",
            offers: { "@type": "Offer", price: String(PRICE_MONTHLY_TAX_INCLUDED), priceCurrency: "JPY", description: `月額${price}円（税込）・${TRIAL_DAYS}日間無料体験` },
            publisher: { "@type": "Organization", name: COMPANY_NAME },
            url: appUrl,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      {/* 1. ファーストビュー */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <Smartphone className="size-4" /> 写真付き作業報告書クラウド
            </p>
            <h1 className="mt-5 text-[1.85rem] leading-tight font-bold tracking-tight text-navy-900 sm:text-5xl">
              現場で撮って、
              <br />
              その場で<span className="text-brand-600">報告書が完成。</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-700">
              スマホで写真を撮り、作業内容を入力するだけ。
              <br className="hidden sm:block" />
              きれいなA4の作業報告書PDFが数分で完成し、そのままお客様へメール送信できます。
            </p>
            <Cta className="mt-8" />
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-700">
              {[`月額${price}円（税込）`, "初期費用0円", "ユーザー追加無料", "いつでも解約可能"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto flex w-full max-w-lg items-end justify-center gap-4">
            <div className="w-[46%] rounded-[2rem] border-[6px] border-navy-900 bg-navy-900 shadow-2xl">
              <Image src="/lp/app-editor.png" alt="報告書作成画面（スマートフォン）" width={390} height={844} className="rounded-[1.6rem]" priority />
            </div>
            <div className="w-[54%] -rotate-2 rounded-lg bg-white shadow-2xl ring-1 ring-slate-200">
              <Image src="/lp/sample-photos.png" alt="作業報告書PDFのサンプル（写真ページ）" width={595} height={842} className="rounded-lg" priority />
            </div>
          </div>
        </div>
      </section>

      {/* 2. サービスの特徴 */}
      <section id="features" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="サービスの特徴" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <f.icon className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy-900">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 利用イメージ */}
      <section className="bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="使い方は3ステップ" />
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl bg-white p-6 shadow-sm">
                <span className="absolute -top-4 left-6 flex size-9 items-center justify-center rounded-full bg-navy-900 font-bold text-white">{i + 1}</span>
                <s.icon className="mt-2 size-8 text-brand-600" />
                <h3 className="mt-3 text-xl font-bold text-navy-900">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid items-center gap-6 md:grid-cols-3">
            {[
              ["/lp/app-photos.png", "写真の撮影・分類・コメント入力"],
              ["/lp/app-report.png", "確定した報告書の画面"],
              ["/lp/app-send.png", "お客様へのメール送信"],
            ].map(([src, alt]) => (
              <figure key={src} className="mx-auto w-full max-w-[260px]">
                <div className="rounded-[1.8rem] border-[6px] border-navy-900 bg-navy-900 shadow-xl">
                  <Image src={src} alt={alt} width={390} height={844} className="rounded-[1.4rem]" />
                </div>
                <figcaption className="mt-3 text-center text-sm font-bold text-slate-700">{alt}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 作業報告書サンプル */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="mx-auto max-w-md rounded-lg bg-white shadow-2xl ring-1 ring-slate-200">
              <Image src="/lp/sample-report.png" alt="作業報告書のサンプル（1ページ目）" width={595} height={842} className="rounded-lg" />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionTitle title="作業報告書サンプル" align="left" />
            <p className="mt-5 leading-relaxed text-slate-700">
              A4縦の報告書に、会社ロゴ・報告書番号・顧客名・現場名・作業日・作業時間・作業内容・使用材料・特記事項・写真とコメントを自動でレイアウトします。印刷してもきれいに読めるデザインです。
            </p>
            <ul className="mt-5 space-y-2 text-[15px] text-slate-700">
              {["写真の並べ方は「2列」と「写真＋説明の横並び」から選択", "写真が多い場合は自動で改ページ", "日本語フォントを埋め込み、どの端末でも文字化けしません", "スマホから保存・共有できます"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-600" />
                  {t}
                </li>
              ))}
            </ul>
            <a href="/lp/sample-report.pdf" target="_blank" rel="noopener" className={buttonClass("secondary", "lg", "mt-7")}>
              <FileText className="size-5" /> サンプルPDFを見る
            </a>
            <p className="mt-2 text-xs text-slate-500">※ サンプルの会社名・内容はすべて架空のものです。</p>
          </div>
        </div>
      </section>

      {/* 5. 導入メリット */}
      <section className="bg-navy-900 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="導入メリット" dark />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {MERITS.map((m) => (
              <div key={m.title} className="flex gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <m.icon className="size-7 shrink-0 text-brand-500" />
                <div>
                  <h3 className="text-lg font-bold">{m.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy-100">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 対応業種 */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="対応業種" />
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {INDUSTRIES.map((i) => (
              <li key={i.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 font-bold text-navy-900">
                <i.icon className="size-6 shrink-0 text-brand-600" /> <span className="text-sm sm:text-base">{i.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. 料金 */}
      <section id="pricing" className="scroll-mt-16 bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="料金" />
          <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-200">
            <p className="font-bold text-brand-700">スタンダードプラン</p>
            <p className="mt-3 text-5xl font-bold text-navy-900">
              {price}
              <span className="text-xl">円</span>
            </p>
            <p className="mt-1 text-slate-600">月額（税込）</p>
            <ul className="mt-6 space-y-3 text-left text-[15px]">
              {["初期費用 0円", `${TRIAL_DAYS}日間の無料体験（カード登録不要）`, "ユーザー数・報告書数の追加料金なし", "全機能が利用可能", "毎月自動更新・いつでも解約可能"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-5 shrink-0 text-emerald-600" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={buttonClass("primary", "lg", "mt-8 w-full")}>
              {TRIAL_DAYS}日間 無料で試す
            </Link>
            <p className="mt-3 text-xs text-slate-500">お支払いはクレジットカード（Stripe）。1写真あたり最大4MB・1報告書あたり写真100枚まで。</p>
          </div>
        </div>
      </section>

      {/* 8. よくある質問 */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionTitle title="よくある質問" />
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {FAQ.slice(0, 7).map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-bold text-navy-900">
                  <span className="mr-2 text-brand-600">Q.</span>
                  {f.q}
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/faq" className="font-bold text-brand-700 underline">
              よくある質問をすべて見る
            </Link>
          </p>
        </div>
      </section>

      {/* 9. 無料体験 */}
      <section className="bg-gradient-to-br from-navy-900 to-navy-700 py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">まずは{TRIAL_DAYS}日間、無料でお試しください</h2>
          <p className="mt-4 text-navy-100">登録は1分。次の現場から、スマホで報告書を作れます。</p>
          <Link href="/signup" className={buttonClass("primary", "lg", "mt-8 h-14 px-10 text-lg")}>
            {TRIAL_DAYS}日間 無料で試す <ArrowRight className="size-5" />
          </Link>
          <p className="mt-3 text-sm text-navy-200">クレジットカード登録不要・自動課金なし</p>
        </div>
      </section>
    </>
  );
}

function SectionTitle({ title, align = "center", dark = false }: { title: string; align?: "center" | "left"; dark?: boolean }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className={`text-2xl font-bold sm:text-3xl ${dark ? "text-white" : "text-navy-900"}`}>{title}</h2>
    </div>
  );
}
