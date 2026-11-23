import { SERVICE_NAME, COMPANY_NAME } from "@/lib/brand";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 改行を <br> にしたエスケープ済み HTML */
export function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br>");
}

export function layout(opts: { title: string; bodyHtml: string; footerNote?: string }): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;background:#f3f3f2;font-family:'Hiragino Sans','Noto Sans JP','Yu Gothic',Meiryo,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f3f2;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:6px;border:1px solid #d6d9de;overflow:hidden;">
<tr><td style="background:#161b22;padding:18px 24px;color:#ffffff;font-weight:bold;font-size:16px;">${escapeHtml(SERVICE_NAME)}</td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.8;">${opts.bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;">${opts.footerNote ? escapeHtml(opts.footerNote) + "<br>" : ""}このメールは ${escapeHtml(SERVICE_NAME)}（運営：${escapeHtml(COMPANY_NAME)}）から送信されています。</td></tr>
</table></td></tr></table></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}

export type Rendered = { subject: string; html: string; text: string };

export function verifyEmailTemplate(name: string, url: string): Rendered {
  const subject = `【${SERVICE_NAME}】メールアドレスの確認`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(name)} 様</p><p>${escapeHtml(SERVICE_NAME)}へのご登録ありがとうございます。<br>下のボタンを押して、メールアドレスの確認を完了してください。</p>${button(url, "メールアドレスを確認する")}<p style="font-size:13px;color:#64748b;">このリンクの有効期限は24時間です。お心当たりがない場合は、このメールを破棄してください。</p>`,
    }),
    text: `${name} 様\n\n${SERVICE_NAME}へのご登録ありがとうございます。\n次のURLを開いて、メールアドレスの確認を完了してください。\n\n${url}\n\nこのリンクの有効期限は24時間です。`,
  };
}

export function resetPasswordTemplate(name: string, url: string): Rendered {
  const subject = `【${SERVICE_NAME}】パスワード再設定のご案内`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(name)} 様</p><p>パスワード再設定のお申し込みを受け付けました。下のボタンから新しいパスワードを設定してください。</p>${button(url, "パスワードを再設定する")}<p style="font-size:13px;color:#64748b;">このリンクの有効期限は1時間です。お心当たりがない場合は、このメールを破棄してください（パスワードは変更されません）。</p>`,
    }),
    text: `${name} 様\n\nパスワード再設定のお申し込みを受け付けました。次のURLから新しいパスワードを設定してください。\n\n${url}\n\nこのリンクの有効期限は1時間です。`,
  };
}

export function inviteTemplate(orgName: string, inviterName: string, url: string): Rendered {
  const subject = `【${SERVICE_NAME}】${orgName} への招待`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(inviterName)} さんから、${escapeHtml(orgName)} の${escapeHtml(SERVICE_NAME)}に招待されました。</p><p>下のボタンからパスワードを設定すると利用を開始できます。</p>${button(url, "パスワードを設定して参加する")}<p style="font-size:13px;color:#64748b;">このリンクの有効期限は7日間です。</p>`,
    }),
    text: `${inviterName} さんから、${orgName} の${SERVICE_NAME}に招待されました。\n次のURLからパスワードを設定してください。\n\n${url}\n\nこのリンクの有効期限は7日間です。`,
  };
}

export function welcomeTemplate(name: string, appUrl: string, trialEnd: string): Rendered {
  const subject = `【${SERVICE_NAME}】ご登録が完了しました`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(name)} 様</p><p>${escapeHtml(SERVICE_NAME)}へようこそ。無料体験は <strong>${escapeHtml(trialEnd)}</strong> までご利用いただけます。</p><p>まずはスマートフォンで「新規報告書」を開き、写真を撮ってみてください。数分で報告書PDFが完成します。</p>${button(appUrl, "管理画面を開く")}`,
    }),
    text: `${name} 様\n\n${SERVICE_NAME}へようこそ。無料体験は ${trialEnd} までご利用いただけます。\n\n${appUrl}`,
  };
}

export function trialEndingTemplate(orgName: string, trialEnd: string, billingUrl: string): Rendered {
  const subject = `【${SERVICE_NAME}】無料体験は ${trialEnd} に終了します`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(orgName)} ご担当者様</p><p>無料体験は <strong>${escapeHtml(trialEnd)}</strong> に終了します。引き続きご利用いただく場合は、管理画面の「契約・お支払い」からお申し込みください（月額7,480円・税込）。</p><p>お申し込みがない場合も、作成済みの報告書はそのまま閲覧・PDFダウンロードできます。</p>${button(billingUrl, "お申し込み手続きへ")}`,
    }),
    text: `${orgName} ご担当者様\n\n無料体験は ${trialEnd} に終了します。引き続きご利用いただく場合は「契約・お支払い」からお申し込みください（月額7,480円・税込）。\n\n${billingUrl}`,
  };
}

export function trialEndedTemplate(orgName: string, billingUrl: string): Rendered {
  const subject = `【${SERVICE_NAME}】無料体験が終了しました`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(orgName)} ご担当者様</p><p>無料体験期間が終了しました。現在は閲覧・PDFダウンロードのみご利用いただけます。</p><p>お申し込みいただくと、すぐに報告書の作成・送信を再開できます。</p>${button(billingUrl, "有料プランに申し込む")}`,
    }),
    text: `${orgName} ご担当者様\n\n無料体験期間が終了しました。現在は閲覧・PDFダウンロードのみご利用いただけます。\n\n${billingUrl}`,
  };
}

export function paymentFailedTemplate(orgName: string, billingUrl: string): Rendered {
  const subject = `【${SERVICE_NAME}】お支払いが完了できませんでした`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(orgName)} ご担当者様</p><p>ご登録のお支払い方法で月額料金の決済ができませんでした。カードの有効期限やご利用限度額をご確認のうえ、お支払い方法を更新してください。</p><p>一定期間お支払いが確認できない場合、ご利用が停止されます。</p>${button(billingUrl, "お支払い方法を確認する")}`,
    }),
    text: `${orgName} ご担当者様\n\nご登録のお支払い方法で決済ができませんでした。お支払い方法を更新してください。\n\n${billingUrl}`,
  };
}

export function canceledTemplate(orgName: string, billingUrl: string): Rendered {
  const subject = `【${SERVICE_NAME}】ご解約手続きが完了しました`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(orgName)} ご担当者様</p><p>ご契約が終了しました。これまでのご利用ありがとうございました。</p><p>作成済みの報告書は引き続き閲覧・PDFダウンロードできます。再開をご希望の場合はいつでもお申し込みいただけます。</p>${button(billingUrl, "契約状況を確認する")}`,
    }),
    text: `${orgName} ご担当者様\n\nご契約が終了しました。これまでのご利用ありがとうございました。\n\n${billingUrl}`,
  };
}

export function adminAlertTemplate(title: string, detail: string): Rendered {
  const subject = `[${SERVICE_NAME} 監視] ${title}`.slice(0, 200);
  return {
    subject,
    html: layout({ title: subject, bodyHtml: `<p><strong>${escapeHtml(title)}</strong></p><pre style="white-space:pre-wrap;font-size:12px;background:#f8fafc;padding:12px;border-radius:4px;">${escapeHtml(detail)}</pre>` }),
    text: `${title}\n\n${detail}`,
  };
}

export function supportReceivedTemplate(name: string): Rendered {
  const subject = `【${SERVICE_NAME}】お問い合わせを受け付けました`;
  return {
    subject,
    html: layout({
      title: subject,
      bodyHtml: `<p>${escapeHtml(name)} 様</p><p>お問い合わせありがとうございます。内容を確認のうえ、担当者より原則2営業日以内にご連絡いたします。</p>`,
    }),
    text: `${name} 様\n\nお問い合わせありがとうございます。内容を確認のうえ、担当者より原則2営業日以内にご連絡いたします。`,
  };
}

export function reportEmailTemplate(opts: {
  orgName: string;
  bodyText: string;
  downloadUrl?: string;
  expiresText?: string;
}): { html: string; text: string } {
  const link = opts.downloadUrl
    ? `${button(opts.downloadUrl, "作業報告書（PDF）を開く")}<p style="font-size:13px;color:#64748b;">ダウンロードリンクの有効期限：${escapeHtml(opts.expiresText ?? "")}</p>`
    : `<p style="font-size:13px;color:#64748b;">作業報告書（PDF）を添付しております。</p>`;
  return {
    html: layout({
      title: `${opts.orgName} 作業報告書`,
      bodyHtml: `<p>${nl2br(opts.bodyText)}</p>${link}`,
      footerNote: `送信者：${opts.orgName}`,
    }),
    text: `${opts.bodyText}\n\n${opts.downloadUrl ? `作業報告書（PDF）：${opts.downloadUrl}\n有効期限：${opts.expiresText}` : "作業報告書（PDF）を添付しております。"}`,
  };
}
