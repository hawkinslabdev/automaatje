import "server-only";

import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  role?: "ADMIN" | "USER";
  isLoggedIn: boolean;
}

// Determine if cookies should be secure (HTTPS only)
// COOKIE_SECURE env var takes precedence, otherwise defaults to true in production
const isSecureCookie = (): boolean => {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === "true";
  }
  return process.env.NODE_ENV === "production";
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "automaatje_session",
  cookieOptions: {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function isAuthenticated() {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new Error("Niet geautoriseerd");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("Alleen beheerders hebben toegang");
  }
  return session;
}
