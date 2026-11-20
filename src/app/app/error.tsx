"use client";

import { Button, Card, LinkButton } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-4 max-w-md p-6 text-center">
      <h1 className="text-lg font-bold text-navy-900">画面を表示できませんでした</h1>
      <p className="mt-2 text-sm text-slate-600">通信状況をご確認のうえ、もう一度お試しください。解決しない場合は、下のエラー番号を添えてお問い合わせください。</p>
      {error.digest && (
        <p className="mt-3 text-sm text-slate-500">
          エラー番号：<span className="font-mono select-all">{error.digest}</span>
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>もう一度表示する</Button>
        <LinkButton href="/app/help#contact" variant="secondary">
          お問い合わせ
        </LinkButton>
      </div>
    </Card>
  );
}
