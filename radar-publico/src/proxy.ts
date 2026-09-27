import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only (cookie presence) — the real session validation happens on the server
 * in the data access layer for every page, Server Action and Route Handler.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = !!request.cookies.get("rp_session")?.value;
  if (!hasSession && pathname !== "/login") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
