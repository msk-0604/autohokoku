"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { retryEmailAction } from "./actions";

export function RetryButton({ reportId, logId }: { reportId: string; logId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryEmailAction(reportId, logId);
            setMsg(r.error ?? r.message ?? null);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-navy-900 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} 再送する
      </button>
      {msg && <p className="mt-1 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
