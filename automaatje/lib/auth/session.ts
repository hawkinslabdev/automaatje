import "server-only";

import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  role?: "ADMIN" | "USER";
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "automaatje_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
