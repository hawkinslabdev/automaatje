"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AVATAR_SEEDS } from "@/lib/avatar";

/**
 * Update the current user's avatar seed
 */
export async function updateUserAvatar(avatarSeed: string) {
  try {
    // Validate avatar seed
    if (!AVATAR_SEEDS.includes(avatarSeed as typeof AVATAR_SEEDS[number])) {
      return { success: false, error: "Ongeldige avatar geselecteerd" };
    }

    // Get current user session
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }

    // Get current user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user) {
      return { success: false, error: "Gebruiker niet gevonden" };
    }

    // Update user profile with new avatar seed
    const currentProfile = user.profile && typeof user.profile === 'object' ? user.profile : { name: '' };

    await db
      .update(schema.users)
      .set({
        profile: {
          ...currentProfile,
          avatarSeed,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, session.userId));

    return { success: true };
  } catch (error) {
    console.error("Update avatar error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Er is een fout opgetreden bij het bijwerken van je avatar",
    };
  }
}
