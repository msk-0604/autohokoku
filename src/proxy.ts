import { NextResponse, type NextRequest } from "next/server";

/**
 * 楽観的な認証チェック（セッション cookie が無ければログイン画面へ）。
 * 本当の検証はサーバー側の DAL（src/lib/auth/dal.ts）で毎回行う。
 */
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("__Host-sr_session") || req.cookies.has("sr_session");
  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
