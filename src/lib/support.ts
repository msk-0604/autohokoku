"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { supportRequests } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { getAuth } from "@/lib/auth/session";
import { emailSchema } from "@/lib/validation";
import { formValues, handleAction, optionalText, requiredText, type ActionState } from "@/lib/actions";
import { AppError } from "@/lib/auth/dal";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { env } from "@/lib/env";
import { sendNotification } from "@/lib/monitoring";
import { adminAlertTemplate, supportReceivedTemplate } from "@/lib/email/templates";
import { SUPPORT_CATEGORIES } from "@/lib/content";

const schema = z.object({
  name: requiredText(50, "お名前"),
  email: emailSchema,
  companyName: optionalText(100),
  category: z.enum(SUPPORT_CATEGORIES),
  message: requiredText(5000, "お問い合わせ内容"),
  website: z.string().max(0).optional(), // スパム対策（人には見えない入力欄）
});

/**
 * お問い合わせの受付。support_requests に保存し、運営者に通知、お客様に受付メールを送る。
 * 将来 AI チャットサポートを追加する場合も、未解決の問い合わせはここに保存すればよい。
 */
export async function submitSupportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ip = await clientIp();
      if (!(await rateLimit(`support:${ip}`, 5, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
      const input = schema.parse(Object.fromEntries(fd));
      const ctx = await getAuth();
      const id = newId();
      await db.insert(supportRequests).values({
        id,
        orgId: ctx?.org.id ?? null,
        userId: ctx?.user.id ?? null,
        name: input.name,
        email: input.email,
        companyName: input.companyName ?? ctx?.org.name ?? null,
        category: input.category,
        message: input.message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const to = env.SUPPORT_EMAIL || env.ADMIN_ALERT_EMAIL;
      if (to) {
        await sendNotification({
          kind: "support_new",
          to,
          rendered: adminAlertTemplate(`お問い合わせ（${input.category}）`, `${input.name} <${input.email}>\n${input.companyName ?? ctx?.org.name ?? ""}\n\n${input.message}`),
        });
      }
      await sendNotification({ orgId: ctx?.org.id, userId: ctx?.user.id, kind: "support_received", to: input.email, rendered: supportReceivedTemplate(input.name), dedupeKey: `support_received:${id}` });
      return { ok: true, message: "お問い合わせを受け付けました。確認メールをお送りしましたので、ご確認ください。" };
    },
    "support.submit",
    values,
  );
}
