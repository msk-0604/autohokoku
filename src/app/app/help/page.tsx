import { requireAuth } from "@/lib/auth/dal";
import { FAQ, GUIDE } from "@/lib/content";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export default async function HelpPage() {
  const ctx = await requireAuth();
  return (
    <>
      <PageHeader title="ヘルプ" />
      <nav aria-label="ヘルプの項目" className="-mx-1 mb-4 flex flex-wrap gap-x-1 text-sm font-bold">
        {[
          ["#guide", "使い方"],
          ["#faq", "よくある質問"],
          ["#contact", "お問い合わせ"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex h-10 items-center rounded-lg px-3 text-brand-700 hover:bg-slate-100">
            {label}
          </a>
        ))}
      </nav>
      <div className="space-y-5">
        <Card id="guide" className="scroll-mt-20">
          <CardHeader title="使い方" />
          <div className="space-y-4 p-4 sm:p-5">
            {GUIDE.map((g) => (
              <section key={g.title}>
                <h3 className="font-bold text-navy-900">{g.title}</h3>
                <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-slate-700">
                  {g.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Card>
        <Card id="faq" className="scroll-mt-20">
          <CardHeader title="よくある質問" />
          <div className="divide-y divide-slate-100 px-4 pb-2 sm:px-5">
            {FAQ.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer font-bold text-navy-900">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </Card>
        <Card id="contact" className="scroll-mt-20">
          <CardHeader title="お問い合わせ" />
          <div className="p-4 sm:p-5">
            <ContactForm defaults={{ name: ctx.user.name, email: ctx.user.email, companyName: ctx.org.name }} />
          </div>
        </Card>
      </div>
    </>
  );
}
