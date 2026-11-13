import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "@/lib/env";
import { newId } from "@/lib/crypto";

export type EmailAttachment = { filename: string; content: Uint8Array; contentType?: string };
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Resend の Idempotency-Key（同じキーの再送は1通だけ届く） */
  idempotencyKey?: string;
};

export class EmailSendError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message);
  }
}

/**
 * メール送信。EMAIL_DRIVER=log のときは実際には送らず .data/outbox に書き出す（開発・テスト用）。
 * 本番で実送信するには EMAIL_DRIVER=resend と RESEND_API_KEY が必要。
 */
export async function sendEmail(msg: EmailMessage): Promise<{ id: string }> {
  if (env.EMAIL_DRIVER === "log") {
    const id = `log_${newId()}`;
    await mkdir(env.OUTBOX_DIR, { recursive: true });
    await writeFile(
      join(env.OUTBOX_DIR, `${Date.now()}_${id}.json`),
      JSON.stringify(
        {
          id,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          replyTo: msg.replyTo,
          attachments: msg.attachments?.map((a) => ({ filename: a.filename, size: a.content.byteLength })),
          idempotencyKey: msg.idempotencyKey,
        },
        null,
        2,
      ),
    );
    if (process.env.EMAIL_FAIL_TO && msg.to === process.env.EMAIL_FAIL_TO) {
      // テスト用：特定アドレスへの送信を失敗させる
      throw new EmailSendError("テスト用の送信失敗", true);
    }
    return { id };
  }

  if (!env.RESEND_API_KEY) throw new EmailSendError("RESEND_API_KEY が設定されていません", false);
  const headers: Record<string, string> = {
    authorization: `Bearer ${env.RESEND_API_KEY}`,
    "content-type": "application/json",
  };
  if (msg.idempotencyKey) headers["Idempotency-Key"] = msg.idempotencyKey.slice(0, 256);

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo || env.EMAIL_REPLY_TO || undefined,
        attachments: msg.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          content_type: a.contentType,
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new EmailSendError(`メールサーバーに接続できませんでした（${(e as Error).message}）`, true);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      detail = (JSON.parse(body) as { message?: string }).message ?? body;
    } catch {}
    throw new EmailSendError(`メール送信に失敗しました（${res.status}: ${detail.slice(0, 300)}）`, res.status === 429 || res.status >= 500);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
