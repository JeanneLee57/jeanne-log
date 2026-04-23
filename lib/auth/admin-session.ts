import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ADMIN_SESSION_COOKIE = "jeanne_log_admin_session";
const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getAdminPassword() {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  return env.ADMIN_PASSWORD;
}

function getAdminSessionSecret() {
  if (!env.ADMIN_SESSION_SECRET) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return env.ADMIN_SESSION_SECRET;
}

function getSecretKey() {
  return new TextEncoder().encode(getAdminSessionSecret());
}

export function verifyAdminPassword(password: string) {
  return password === getAdminPassword();
}

export async function createAdminSessionToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAdminSessionToken(token: string) {
  try {
    const result = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    return result.payload.role === "admin";
  } catch {
    return false;
  }
}

export async function createAdminSessionCookie() {
  const token = await createAdminSessionToken();

  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_DURATION_SECONDS,
    },
  };
}

export function clearAdminSessionCookie() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}

export async function isAdminSessionAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return false;
  }

  return verifyAdminSessionToken(token);
}

export async function assertAdminRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error("Admin session is missing.");
  }

  const isValid = await verifyAdminSessionToken(token);

  if (!isValid) {
    throw new Error("Admin session is invalid.");
  }
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}
