"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { changePasswordAction, deleteLogoAction, inviteMemberAction, updateMemberAction, updateOrgAction, updateProfileAction } from "./actions";
import { Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

type OrgValues = { name: string; postalCode: string | null; address: string | null; phone: string | null; email: string | null; reportPrefix: string };

export function OrgForm({ values, disabled }: { values: OrgValues; disabled: boolean }) {
  const [state, action] = useActionState(updateOrgAction, {});
  const v = { ...values, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <Field label="会社名・屋号" htmlFor="org-name" required error={fe.name} className="sm:col-span-2">
          <Input id="org-name" name="name" defaultValue={v.name} maxLength={100} />
        </Field>
        <Field label="郵便番号" htmlFor="postalCode" error={fe.postalCode}>
          <Input id="postalCode" name="postalCode" defaultValue={v.postalCode ?? ""} inputMode="numeric" maxLength={10} placeholder="100-0001" />
        </Field>
        <Field label="電話番号" htmlFor="org-phone" error={fe.phone}>
          <Input id="org-phone" name="phone" type="tel" defaultValue={v.phone ?? ""} maxLength={30} />
        </Field>
        <Field label="住所" htmlFor="org-address" error={fe.address} className="sm:col-span-2">
          <Input id="org-address" name="address" defaultValue={v.address ?? ""} maxLength={300} />
        </Field>
        <Field label="会社のメールアドレス" htmlFor="org-email" error={fe.email} hint="お客様が報告書メールに返信したときの宛先になります">
          <Input id="org-email" name="email" type="email" defaultValue={v.email ?? ""} maxLength={254} />
        </Field>
        <Field label="報告書番号の頭文字" htmlFor="reportPrefix" error={fe.reportPrefix} hint="例）R → R-2026-0001">
          <Input id="reportPrefix" name="reportPrefix" defaultValue={v.reportPrefix} maxLength={6} />
        </Field>
      </fieldset>
      {!disabled && <SubmitButton>会社情報を保存</SubmitButton>}
    </form>
  );
}

export function LogoForm({ hasLogo, disabled }: { hasLogo: boolean; disabled: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ error?: string; message?: string }>({});
  const [pending, start] = useTransition();
  const [version, setVersion] = useState(0);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/org/logo", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setMsg({ error: json.error ?? "アップロードに失敗しました。" });
    else {
      setMsg({ message: "ロゴを登録しました。PDFに表示されます。" });
      setVersion((v) => v + 1);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <FormMessage state={msg} />
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/org/logo?v=${version}`} alt="会社ロゴ" className="max-h-20 max-w-[80%] object-contain" />
        ) : (
          <span className="text-sm text-slate-500">ロゴ未登録（PDFには会社名が表示されます）</span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-navy-900">
            <Upload className="size-4" /> ロゴを選ぶ
            <input ref={ref} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && start(() => upload(e.target.files![0]))} data-testid="logo-input" />
          </label>
          {hasLogo && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setMsg(await deleteLogoAction());
                  router.refresh();
                })
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-red-600"
            >
              <Trash2 className="size-4" /> 削除
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-slate-500">PNG・JPEG、2MBまで。横長のロゴがきれいに表示されます。</p>
    </div>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMemberAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="お名前" htmlFor="invite-name" error={fe.name}>
          <Input id="invite-name" name="name" defaultValue={state.ok ? "" : state.values?.name} />
        </Field>
        <Field label="メールアドレス" htmlFor="invite-email" error={fe.email}>
          <Input id="invite-email" name="email" type="email" defaultValue={state.ok ? "" : state.values?.email} />
        </Field>
        <Field label="権限" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="member">
            <option value="member">一般ユーザー</option>
            <option value="admin">管理者</option>
          </Select>
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="送信しています…">
        招待メールを送る
      </SubmitButton>
    </form>
  );
}

export function MemberControls({ userId, role, disabled }: { userId: string; role: "admin" | "member"; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = (change: { role?: "admin" | "member"; disabled?: boolean }) =>
    start(async () => {
      const r = await updateMemberAction(userId, change);
      setErr(r.error ?? null);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="権限"
        value={role}
        disabled={pending || disabled}
        onChange={(e) => run({ role: e.target.value as "admin" | "member" })}
        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
      >
        <option value="member">一般ユーザー</option>
        <option value="admin">管理者</option>
      </select>
      <button type="button" disabled={pending} onClick={() => confirm(disabled ? "利用を再開しますか？" : "このメンバーの利用を停止しますか？") && run({ disabled: !disabled })} className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold">
        {disabled ? "利用再開" : "利用停止"}
      </button>
      {err && <p className="w-full text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function ProfileForms({ name }: { name: string }) {
  const [pState, pAction] = useActionState(updateProfileAction, {});
  const [pwState, pwAction] = useActionState(changePasswordAction, {});
  const fe = pwState.fieldErrors ?? {};
  return (
    <div className="space-y-6">
      <form action={pAction} className="space-y-3">
        <FormMessage state={pState} />
        <Field label="お名前" htmlFor="profile-name">
          <Input id="profile-name" name="name" defaultValue={name} maxLength={50} />
        </Field>
        <SubmitButton variant="secondary">お名前を保存</SubmitButton>
      </form>
      <form action={pwAction} className="space-y-3 border-t border-slate-100 pt-5">
        <FormMessage state={pwState} />
        <Field label="現在のパスワード" htmlFor="pw-current" error={fe.current}>
          <Input id="pw-current" name="current" type="password" autoComplete="current-password" />
        </Field>
        <Field label="新しいパスワード" htmlFor="pw-new" error={fe.password} hint="8文字以上・英字と数字を含めてください">
          <Input id="pw-new" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="新しいパスワード（確認）" htmlFor="pw-confirm" error={fe.confirm}>
          <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" />
        </Field>
        <SubmitButton variant="secondary">パスワードを変更</SubmitButton>
      </form>
    </div>
  );
}
