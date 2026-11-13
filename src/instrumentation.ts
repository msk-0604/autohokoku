import type { Instrumentation } from "next";

/** サーバーで捕捉されなかったエラーを system_errors に記録する（運営管理画面・日次監視で確認） */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { reportError } = await import("@/lib/monitoring");
    await reportError(`request:${context.routeType}`, err, {
      path: request.path,
      method: request.method,
      route: context.routePath,
      digest: typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined,
    });
  } catch (e) {
    console.error("[instrumentation] failed to report error", e);
  }
};
