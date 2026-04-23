import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/admin-session";

export async function POST() {
  const sessionCookie = clearAdminSessionCookie();
  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.options
  );

  return response;
}
