import type { PlanStatus } from "@/lib/db/schema";

export type AccessInfo = {
  /** 報告書の作成・編集・送信ができるか */
  canWrite: boolean;
  status: PlanStatus;
  label: string;
  tone: "ok" | "warn" | "danger";
  trialDaysLeft: number | null;
  message: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * 契約状態から利用可否を決める（サーバー側で必ずこの関数を通す）。
 * - 無料体験中（期限内）・有料契約中・支払い遅延中（Stripe の再請求期間）は全機能
 * - それ以外は閲覧・PDFダウンロードのみ（データは消さない）
 */
export function accessOf(org: { planStatus: PlanStatus; trialEndsAt: Date | number }, now = Date.now()): AccessInfo {
  const trialEnd = typeof org.trialEndsAt === "number" ? org.trialEndsAt : org.trialEndsAt.getTime();
  switch (org.planStatus) {
    case "active":
      return { canWrite: true, status: "active", label: "ご契約中", tone: "ok", trialDaysLeft: null, message: null };
    case "trialing": {
      if (trialEnd > now) {
        const days = Math.max(0, Math.ceil((trialEnd - now) / DAY));
        return {
          canWrite: true,
          status: "trialing",
          label: "無料体験中",
          tone: days <= 3 ? "warn" : "ok",
          trialDaysLeft: days,
          message: `無料体験の残り日数：${days}日`,
        };
      }
      return expired("trial_expired");
    }
    case "past_due":
      return {
        canWrite: true,
        status: "past_due",
        label: "お支払い確認中",
        tone: "warn",
        trialDaysLeft: null,
        message: "お支払いが確認できていません。お支払い方法をご確認ください。",
      };
    default:
      return expired(org.planStatus);
  }
}

function expired(status: PlanStatus): AccessInfo {
  const label =
    status === "trial_expired" ? "無料体験終了" : status === "canceled" ? "解約済み" : status === "unpaid" ? "未払い" : "停止中";
  return {
    canWrite: false,
    status,
    label,
    tone: "danger",
    trialDaysLeft: null,
    message: "現在は閲覧のみご利用いただけます。引き続きご利用いただくには、有料プランへのお申し込みが必要です。",
  };
}
