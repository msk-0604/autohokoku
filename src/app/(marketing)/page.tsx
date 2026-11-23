import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { FAQ } from "@/lib/content";
import { COMPANY_NAME, PRICE_MONTHLY_TAX_INCLUDED, SERVICE_NAME, TRIAL_DAYS } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${SERVICE_NAME}｜スマホで写真付き作業報告書を作成・PDF出力・メール送信` },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SERVICE_NAME,
    title: `${SERVICE_NAME}｜撮った写真が、そのまま報告書になる。`,
    description: `現場で写真を撮って入力するだけで、A4の作業報告書PDFができ、そのままお客様へメール送信。月額${PRICE_MONTHLY_TAX_INCLUDED.toLocaleString()}円（税込）・${TRIAL_DAYS}日間無料体験。`,
  },
  twitter: { card: "summary_large_image" },
};

const price = PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP");

const STEPS = [
  { img: "/lp/app-photos.png", title: "撮る", body: "「作業前」「作業中」「作業後」を選んで撮影。写真は端末側で縮小してから送るので、現場の回線でも待ち時間が短くなります。" },
  { img: "/lp/app-editor.png", title: "書く", body: "現場・作業日・作業内容を入力。写真ごとの説明は、よく使う言葉をボタンで入れられます。途中で閉じても下書きが残ります。" },
  { img: "/lp/app-report.png", title: "確定する", body: "「確定する」でA4の報告書PDFができます。確定後に直すと新しい版になり、前の内容は履歴に残ります。" },
  { img: "/lp/app-send.png", title: "送る", body: "顧客のメールアドレスへ、そのまま送信。ダウンロードリンクかPDF添付を選べ、送った日時と宛先が記録されます。" },
];

const SPEC: [string, ReactNode][] = [
  ["使う端末", "iPhone・Android・パソコンのブラウザ（アプリのインストール不要）"],
  ["写真", "1報告書あたり最大100枚。1枚4MBまで（端末側で自動縮小）。作業前・作業中・作業後の分類と説明文"],
  ["報告書PDF", "A4縦。会社ロゴ・報告書番号・顧客・現場・作業日時・作業内容・使用材料・特記事項・写真。写真の並べ方は「2列」「写真と説明を横並び」の2種類。日本語フォント埋め込み"],
  ["送信", "アプリからメール送信。ダウンロードリンク（14日間有効）またはPDF添付。送信履歴・再送"],
  ["修正の記録", "確定後の修正は版として保存。いつ・誰が直したかを確認可能"],
  ["整理・検索", "顧客・現場ごとに一覧。報告書番号・顧客名・内容で検索"],
  ["利用人数", "メンバーを招待して共同利用。管理者と一般の2つの権限。人数による追加料金なし"],
  ["データの扱い", "会社ごとに分離して保存し、表示のたびに権限を確認。写真・PDFは権限のある人だけが開けます"],
];

const INDUSTRIES: [string, string][] = [
  ["建設業", "工程写真、完了報告"],
  ["電気工事業", "施工前後、分電盤・配線の確認"],
  ["空調・設備工事業", "点検・清掃・交換の前後"],
  ["清掃業", "作業前後、定期清掃の記録"],
  ["修理・メンテナンス業", "不具合箇所、交換部品"],
  ["リフォーム業", "施工前後、仕上がりの確認"],
];

const PRICING: [string, ReactNode][] = [
  ["月額", <span key="p" className="num text-base font-medium text-navy-900">{price}円（税込）</span>],
  ["初期費用", <span key="i" className="num">0円</span>],
  ["無料体験", `${TRIAL_DAYS}日間。クレジットカードの登録は不要で、自動で課金されることはありません`],
  ["追加料金", "ユーザー数・報告書数による追加料金はありません"],
  ["お支払い", "クレジットカード（Stripe）。毎月自動更新"],
  ["解約", "管理画面からいつでも。契約期間の終了日までは使えます"],
];

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

      {/* ファーストビュー */}
      <section className="border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-16 lg:pb-16">
          <div className="min-w-0">
            <p className="text-sm text-slate-600">写真付き作業報告書の作成・送信サービス</p>
            <h1 className="mt-3 text-[1.75rem] leading-[1.35] font-bold text-navy-900 sm:text-[2.5rem]">
              撮った写真が、
              <br />
              そのまま報告書になる。
            </h1>
            <p className="mt-5 max-w-xl text-base leading-[1.9] text-slate-700">
              現場でスマホから写真を撮り、作業内容を入力して「確定」。A4の作業報告書PDFができ、その場でお客様へメールで送れます。写真をパソコンに移して貼り付ける作業はいりません。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/signup" className={buttonClass("primary", "lg")}>
                {TRIAL_DAYS}日間 無料で試す
              </Link>
              <a href="/lp/sample-report.pdf" target="_blank" rel="noopener" className="text-sm font-bold text-navy-900 underline decoration-slate-300 underline-offset-4 hover:decoration-navy-900">
                報告書のサンプル（PDF）
              </a>
            </div>
            <dl className="mt-8 grid grid-cols-2 border-t border-l border-slate-200 text-sm sm:grid-cols-4">
              {[
                ["月額（税込）", `${price}円`],
                ["初期費用", "0円"],
                ["無料体験", `${TRIAL_DAYS}日間`],
                ["カード登録", "不要"],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-b border-slate-200 px-3 py-2.5">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="num mt-0.5 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-end gap-3 sm:gap-5">
            <figure className="min-w-0">
              <Image src="/lp/app-editor.png" alt="報告書の入力画面（スマートフォン）" width={390} height={844} className="w-full rounded-xl border border-slate-300" priority />
              <figcaption className="mt-2 text-xs text-slate-500">入力画面（スマホ）</figcaption>
            </figure>
            <figure className="min-w-0">
              <Image src="/lp/sample-photos.png" alt="作業報告書PDFの写真ページ" width={595} height={842} className="w-full border border-slate-300" priority />
              <figcaption className="mt-2 text-xs text-slate-500">できあがるPDF（写真ページ）</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <Section id="how" no="01" title="使い方" lead="現場で4つの操作をするだけです。">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="min-w-0">
              <Image src={s.img} alt={`${s.title}：画面例`} width={390} height={844} className="w-full rounded-xl border border-slate-300" />
              <h3 className="mt-4 flex items-baseline gap-2 font-bold text-navy-900">
                <span className="num text-sm text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-[1.8] text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 報告書の仕上がり */}
      <Section id="sample" no="02" title="報告書の仕上がり" lead="会社の書式として出せる体裁にしています。印刷しても、画面で見ても崩れません。">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-5">
            <figure className="min-w-0">
              <Image src="/lp/sample-report.png" alt="作業報告書PDF 1ページ目" width={595} height={842} className="w-full border border-slate-300" />
              <figcaption className="mt-2 text-xs text-slate-500">1ページ目：作業の概要</figcaption>
            </figure>
            <figure className="min-w-0">
              <Image src="/lp/sample-photos.png" alt="作業報告書PDF 写真ページ" width={595} height={842} className="w-full border border-slate-300" />
              <figcaption className="mt-2 text-xs text-slate-500">2ページ目以降：写真と説明</figcaption>
            </figure>
          </div>
          <div className="min-w-0">
            <dl className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
              {[
                ["用紙", "A4縦"],
                ["記載項目", "会社ロゴ、報告書番号、作成日、顧客、現場、作業日時、担当者、作業内容、使用材料、特記事項"],
                ["写真", "2列、または写真と説明を横並び。枚数が多いときは自動で改ページ"],
                ["番号", "会社ごとの連番（例：R-2026-0001）"],
                ["文字", "日本語フォントを埋め込み、どの端末でも同じ見た目"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3">
                  <dt className="font-bold text-navy-900">{k}</dt>
                  <dd className="leading-[1.8] text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
            <a href="/lp/sample-report.pdf" target="_blank" rel="noopener" className={buttonClass("secondary", "md", "mt-6")}>
              サンプルPDFを開く
            </a>
            <p className="mt-2 text-xs text-slate-500">サンプルの会社名・内容は架空のものです。</p>
          </div>
        </div>
      </Section>

      {/* 仕様 */}
      <Section id="spec" no="03" title="仕様" lead="できることと、その範囲です。">
        <SpecTable rows={SPEC} />
      </Section>

      {/* 対象の業種 */}
      <Section no="04" title="対象の業種" lead="写真を添えて作業を報告する仕事であれば、業種を問わず使えます。">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-navy-900 text-left">
                <th className="py-2 pr-4 font-bold text-navy-900">業種</th>
                <th className="py-2 font-bold text-navy-900">報告書の例</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRIES.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-200">
                  <td className="py-3 pr-4 whitespace-nowrap text-navy-900">{k}</td>
                  <td className="py-3 text-slate-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 料金 */}
      <Section id="pricing" no="05" title="料金" lead="プランは1つだけです。機能の制限はありません。">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <SpecTable rows={PRICING} />
          <div className="min-w-0 border border-slate-300 bg-white p-5 sm:p-6">
            <p className="text-sm text-slate-600">月額（税込）</p>
            <p className="num mt-1 text-4xl font-medium text-navy-900">
              {price}
              <span className="ml-1 font-sans text-lg">円</span>
            </p>
            <p className="mt-3 text-sm leading-[1.8] text-slate-700">
              最初の{TRIAL_DAYS}日間は無料です。体験が終わっても自動で課金はされず、続ける場合だけ管理画面から申し込みます。
            </p>
            <Link href="/signup" className={buttonClass("primary", "lg", "mt-5 w-full")}>
              {TRIAL_DAYS}日間 無料で試す
            </Link>
          </div>
        </div>
      </Section>

      {/* よくある質問 */}
      <Section no="06" title="よくある質問">
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {FAQ.slice(0, 7).map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 py-4 font-bold text-navy-900 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{f.q}</span>
                <span aria-hidden className="num mt-0.5 shrink-0 text-slate-400 group-open:hidden">+</span>
                <span aria-hidden className="num mt-0.5 hidden shrink-0 text-slate-400 group-open:inline">−</span>
              </summary>
              <p className="pb-5 text-[15px] leading-[1.85] text-slate-700">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-5">
          <Link href="/faq" className="text-sm font-bold text-navy-900 underline decoration-slate-300 underline-offset-4 hover:decoration-navy-900">
            よくある質問をすべて見る
          </Link>
        </p>
      </Section>

      {/* 申し込み */}
      <section className="border-t border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">次の現場から使えます。</h2>
            <p className="mt-2 text-sm text-slate-600">登録はメールアドレスとパスワードだけ。{TRIAL_DAYS}日間は無料、カード登録は不要です。</p>
          </div>
          <Link href="/signup" className={buttonClass("primary", "lg", "shrink-0")}>
            {TRIAL_DAYS}日間 無料で試す
          </Link>
        </div>
      </section>
    </>
  );
}

function Section({ id, no, title, lead, children }: { id?: string; no: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-slate-200 last:border-b-0">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 grid gap-2 border-t-2 border-navy-900 pt-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
          <h2 className="flex items-baseline gap-3 text-xl font-bold text-navy-900 sm:text-2xl">
            <span aria-hidden className="num text-sm font-normal text-slate-500">{no}</span>
            {title}
          </h2>
          {lead && <p className="text-[15px] leading-[1.8] text-slate-600 md:pt-1.5">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function SpecTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="min-w-0 divide-y divide-slate-200 border-y border-slate-200 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="font-bold text-navy-900">{k}</dt>
          <dd className="leading-[1.8] text-slate-700">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
