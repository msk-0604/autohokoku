"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-8 max-w-md p-6 text-center">
      <AlertTriangle className="mx-auto size-10 text-amber-500" />
      <h1 className="mt-3 text-lg font-bold text-navy-900">エラーが発生しました</h1>
      <p className="mt-2 text-sm text-slate-600">お手数ですが、もう一度お試しください。解決しない場合はヘルプのお問い合わせからご連絡ください。</p>
      <Button className="mt-5" onClick={reset}>
        再読み込み
      </Button>
    </Card>
  );
}
