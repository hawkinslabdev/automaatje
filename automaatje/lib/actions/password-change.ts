"use server";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/password-change";

/**
 * Change user password (requires current password verification)
 */
export async function changePassword(
  input: ChangePasswordInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = changePasswordSchema.parse(input);

    // Get current user from session
    const session = await requireAuth();

    // requireAuth ensures userId exists, but TypeScript doesn't know that
    if (!session.userId) {
      throw new Error("Session userId is missing");
    }

    // Get user from database
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    if (users.length === 0) {
      return {
        success: false,
        error: "Gebruiker niet gevonden",
      };
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await verifyPassword(
      validated.currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      return {
        success: false,
        error: "Huidig wachtwoord is onjuist",
      };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validated.password);

    // Update user password
    await db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Password change error:", error);

    if (error instanceof Error && error.message.includes("validation")) {
      return {
        success: false,
        error: "Ongeldige invoer. Controleer je gegevens.",
      };
    }

    return {
      success: false,
      error: "Er is een fout opgetreden. Probeer het later opnieuw.",
    };
  }
}
