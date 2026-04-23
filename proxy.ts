import { NextResponse, type NextRequest } from "next/server";
import {
  getAdminSessionCookieName,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-session";

const STUDIO_LOGIN_PATH = "/studio/login";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === STUDIO_LOGIN_PATH) {
    const token = request.cookies.get(getAdminSessionCookieName())?.value;
    if (token && (await verifyAdminSessionToken(token))) {
      return NextResponse.redirect(new URL("/studio/drafts", request.url));
    }

    return NextResponse.next();
  }

  const isProtectedStudioPath = pathname.startsWith("/studio");
  const isProtectedAdminApiPath = pathname.startsWith("/api/admin");

  if (!isProtectedStudioPath && !isProtectedAdminApiPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  const isAuthenticated = token ? await verifyAdminSessionToken(token) : false;

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (isProtectedAdminApiPath) {
    return NextResponse.json(
      {
        ok: false,
        error: "Admin authentication required.",
      },
      { status: 401 }
    );
  }

  const loginUrl = new URL(STUDIO_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/studio/:path*", "/api/admin/:path*"],
};
