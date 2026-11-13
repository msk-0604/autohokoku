import { BookOpen, HelpCircle, MessageCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { FAQ, GUIDE } from "@/lib/content";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export default async function HelpPage() {
  const ctx = await requireAuth();
  return (
    <>
      <PageHeader title="ヘルプ" description="使い方・よくある質問・お問い合わせ" />
      <div className="space-y-5">
        <Card>
          <CardHeader title="操作ガイド" icon={<BookOpen className="size-4 text-brand-600" />} />
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
        <Card>
          <CardHeader title="よくある質問" icon={<HelpCircle className="size-4 text-brand-600" />} />
          <div className="divide-y divide-slate-100 px-4 pb-2 sm:px-5">
            {FAQ.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer font-bold text-navy-900">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </Card>
        <Card id="contact">
          <CardHeader title="お問い合わせ" icon={<MessageCircle className="size-4 text-brand-600" />} />
          <div className="p-4 sm:p-5">
            <ContactForm defaults={{ name: ctx.user.name, email: ctx.user.email, companyName: ctx.org.name }} />
          </div>
        </Card>
      </div>
    </>
  );
}
