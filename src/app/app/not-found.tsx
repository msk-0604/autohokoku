import { Card, LinkButton } from "@/components/ui";

/** 管理画面の中で見つからないとき（メニューは残したまま表示する） */
export default function AppNotFound() {
  return (
    <Card className="mx-auto mt-4 max-w-md p-6 text-center">
      <h1 className="text-lg font-bold text-navy-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-slate-600">削除されたか、アクセスする権限のないページです。</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <LinkButton href="/app/reports">報告書一覧へ</LinkButton>
        <LinkButton href="/app" variant="secondary">
          ダッシュボードへ
        </LinkButton>
      </div>
    </Card>
  );
}
