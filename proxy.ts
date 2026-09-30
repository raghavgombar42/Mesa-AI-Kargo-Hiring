import { NextResponse, type NextRequest } from "next/server";
import { passwordEnabled, SESSION_COOKIE, sessionToken } from "./lib/auth";

export function proxy(request: NextRequest) {
  if (!passwordEnabled()) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value === sessionToken()) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
