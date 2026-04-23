import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/auth/admin-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid password.",
        },
        { status: 401 }
      );
    }

    const sessionCookie = await createAdminSessionCookie();
    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
