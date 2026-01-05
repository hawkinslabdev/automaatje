import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth";
import { fixBrokenAddresses } from "@/lib/migrations/fix-addresses";

/**
 * Admin-only endpoint to fix broken addresses in the database
 * This migrates verbose Nominatim addresses to clean Dutch format
 *
 * Usage: POST /api/admin/fix-addresses
 */
export async function POST() {
  try {
    // Check if user is admin
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Alleen administrators kunnen adressen migreren" },
        { status: 403 }
      );
    }

    // Run the migration
    const result = await fixBrokenAddresses();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Adressen succesvol gemigreerd",
        fixed: result.fixed,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Er is een fout opgetreden bij het migreren van adressen"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Address migration error:", error);
    return NextResponse.json(
      { error: "Er is een onverwachte fout opgetreden" },
      { status: 500 }
    );
  }
}
