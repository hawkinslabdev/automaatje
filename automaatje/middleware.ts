import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for /setup - let the route handle setup logic
  if (pathname === "/setup") {
    return NextResponse.next();
  }

  // Normal authentication logic (after setup is complete)
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Check if session is valid (has required fields)
  const hasValidSession = session.isLoggedIn && session.userId;

  // Redirect to dashboard if logged in and trying to access auth pages
  if (isPublicRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect to login if not logged in and trying to access protected pages
  if (!isPublicRoute && pathname !== "/" && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect from home to dashboard if logged in
  if (pathname === "/" && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect from home to login if not logged in
  if (pathname === "/" && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
