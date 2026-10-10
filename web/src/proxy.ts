import { NextResponse, type NextRequest } from "next/server";

/** Optimistic auth gate: bounce signed-out visitors away from /app and signed-in users away from auth pages.
 *  The API re-validates the JWT on every request, so this is UX only. */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("lustra_token");
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
