/** 画面の切り替え中に、内容の形だけを先に表示する（押しても反応がないように見えるのを防ぐ） */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="読み込み中" className="animate-pulse">
      <div className="mb-5 h-8 w-48 rounded-lg bg-slate-200" />
      <div className="mb-5 h-20 rounded-xl bg-slate-200/70" />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-14 shrink-0 rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/3 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">読み込み中…</span>
    </div>
  );
}
