/** 日本時間の日付ユーティリティ（サーバー・クライアント共通） */
const TZ = "Asia/Tokyo";

export function todayJst(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now); // YYYY-MM-DD
}

/** JST の当月1日 00:00 を UNIX ミリ秒で返す */
export function monthStartJstMs(now = new Date()): number {
  const [y, m] = todayJst(now).split("-").map(Number);
  return Date.UTC(y, m - 1, 1, -9, 0, 0);
}

export function formatDate(d: string | Date | number | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    const wd = "日月火水木金土"[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
    return `${y}年${m}月${day}日（${wd}）`;
  }
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function formatDateTime(d: Date | number | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function workDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}時間${m ? `${m}分` : ""}` : `${m}分`;
}
