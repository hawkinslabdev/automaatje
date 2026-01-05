/**
 * Migration script to add avatarSeed to existing users
 * Run this once to update all existing users with a random avatar seed
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getRandomAvatarSeed } from "@/lib/avatar";

export async function addAvatarSeedToExistingUsers() {
  try {
    console.log("Starting migration: Adding avatar seeds to existing users...");

    // Get all users
    const users = await db.query.users.findMany();

    let updatedCount = 0;

    for (const user of users) {
      const profile = user.profile && typeof user.profile === 'object' ? user.profile : { name: '' };

      // Only update if avatarSeed is not already set
      if (!('avatarSeed' in profile) || !profile.avatarSeed) {
        const avatarSeed = getRandomAvatarSeed();

        await db
          .update(schema.users)
          .set({
            profile: {
              ...profile,
              avatarSeed,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));

        updatedCount++;
        console.log(`Updated user ${user.id} with avatar seed: ${avatarSeed}`);
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} users.`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error("Migration error:", error);
    return { success: false, error };
  }
}
