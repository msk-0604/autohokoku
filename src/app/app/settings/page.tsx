import { asc, eq } from "drizzle-orm";
import { Building2, Users, UserCircle, ImageIcon } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { InviteForm, LogoForm, MemberControls, OrgForm, ProfileForms } from "./forms";

export default async function SettingsPage() {
  const ctx = await requireAuth();
  const isAdmin = ctx.role === "admin";
  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, verified: users.emailVerifiedAt, hasPassword: users.passwordHash, role: memberships.role, disabledAt: memberships.disabledAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.org.id))
    .orderBy(asc(memberships.createdAt));

  return (
    <>
      <PageHeader title="会社設定" description={isAdmin ? undefined : "会社情報とメンバーの変更は管理者のみ行えます。"} />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="会社情報" icon={<Building2 className="size-4 text-brand-600" />} />
            <div className="p-4 sm:p-5">
              <OrgForm values={ctx.org} disabled={!isAdmin} />
            </div>
          </Card>
          <Card>
            <CardHeader title="メンバー" icon={<Users className="size-4 text-brand-600" />} />
            <ul className="divide-y divide-slate-100 px-4 sm:px-5" data-testid="member-list">
              {members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">
                      {m.name} {m.userId === ctx.user.id && <span className="text-xs font-normal text-slate-500">（あなた）</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge tone={m.role === "admin" ? "navy" : "slate"}>{m.role === "admin" ? "管理者" : "一般ユーザー"}</Badge>
                      {!m.hasPassword && <Badge tone="amber">招待中</Badge>}
                      {m.disabledAt && <Badge tone="red">停止中</Badge>}
                    </div>
                  </div>
                  {isAdmin && m.userId !== ctx.user.id && <MemberControls userId={m.userId} role={m.role} disabled={!!m.disabledAt} />}
                </li>
              ))}
            </ul>
            {isAdmin && (
              <div className="border-t border-slate-100 p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-bold text-navy-900">メンバーを招待</h3>
                <InviteForm />
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="会社ロゴ" icon={<ImageIcon className="size-4 text-brand-600" />} />
            <div className="p-4 sm:p-5">
              <LogoForm hasLogo={!!ctx.org.logoKey} disabled={!isAdmin} />
            </div>
          </Card>
          <Card>
            <CardHeader title="ログイン情報" icon={<UserCircle className="size-4 text-brand-600" />} />
            <div className="p-4 sm:p-5">
              <p className="mb-4 text-sm text-slate-600">{ctx.user.email}</p>
              <ProfileForms name={ctx.user.name} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
