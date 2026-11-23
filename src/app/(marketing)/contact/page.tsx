import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "お問い合わせ", description: "サービスに関するご質問・導入のご相談はこちらから。", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-navy-900">お問い合わせ</h1>
      <p className="mt-3 text-slate-600">内容を確認のうえ、原則2営業日以内にメールでご連絡いたします。</p>
      <div className="mt-8 rounded-xl border border-slate-200 p-5 sm:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
