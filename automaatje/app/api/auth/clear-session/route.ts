import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.redirect(new URL("/login", request.url));
  } catch (error) {
    console.error("Clear session error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
