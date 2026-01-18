import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkSetupRequired } from "@/lib/actions/setup";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    session.destroy();

    // Check if setup is required (no users in database)
    const setupRequired = await checkSetupRequired();
    const redirectUrl = setupRequired ? "/setup" : "/login";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Clear session error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
