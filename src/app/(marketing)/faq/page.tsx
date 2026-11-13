import type { Metadata } from "next";
import { FAQ, GUIDE } from "@/lib/content";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "よくある質問・操作ガイド",
  description: "料金・無料体験・解約・使い方など、よくあるご質問と操作ガイドです。",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <h1 className="text-3xl font-bold text-navy-900">よくある質問</h1>
      <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
        {FAQ.map((f) => (
          <section key={f.q} className="p-5">
            <h2 className="font-bold text-navy-900">
              <span className="mr-2 text-brand-600">Q.</span>
              {f.q}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{f.a}</p>
          </section>
        ))}
      </div>
      <h2 id="guide" className="mt-14 text-2xl font-bold text-navy-900">
        操作ガイド
      </h2>
      <div className="mt-6 space-y-6">
        {GUIDE.map((g) => (
          <section key={g.title} className="rounded-2xl bg-surface p-5">
            <h3 className="font-bold text-navy-900">{g.title}</h3>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[15px] text-slate-700">
              {g.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
