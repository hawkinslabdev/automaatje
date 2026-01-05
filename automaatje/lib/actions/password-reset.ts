"use server";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { hashPassword } from "@/lib/auth/password";
import { generatePasswordResetEmail } from "@/lib/email/password-reset-template";
import {
  requestResetSchema,
  verifyResetSchema,
  type RequestResetInput,
  type VerifyResetInput,
} from "@/lib/validations/password-reset";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Check if Resend is configured for password reset functionality
 */
export async function checkResendConfigured(): Promise<boolean> {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM_EMAIL
  );
}

/**
 * Generate a random 6-digit code
 */
function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Clean up expired tokens (called internally)
 */
async function cleanupExpiredTokens(userId: string): Promise<void> {
  try {
    await db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.userId, userId));
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
}

/**
 * Request a password reset - generates token and sends email
 * Returns success regardless of whether email exists (security)
 */
export async function requestPasswordReset(
  input: RequestResetInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = requestResetSchema.parse(input);

    // Check if Resend is configured
    if (!resend || !process.env.RESEND_FROM_EMAIL) {
      return {
        success: false,
        error: "E-mail functionaliteit is niet geconfigureerd",
      };
    }

    // Look up user by email
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, validated.email))
      .limit(1);

    // If user doesn't exist, return success anyway (don't reveal email existence)
    if (users.length === 0) {
      // Simulate some processing time to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    }

    const user = users[0];

    // Rate limiting check: Don't allow more than 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await db
      .select()
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.userId, user.id),
          lt(schema.passwordResetTokens.createdAt, oneHourAgo)
        )
      );

    if (recentTokens.length >= 3) {
      // Don't reveal rate limiting to user
      return { success: true };
    }

    // Clean up any existing tokens for this user
    await cleanupExpiredTokens(user.id);

    // Generate 6-digit code
    const token = generateSixDigitCode();

    // Create token record with 15-minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(schema.passwordResetTokens).values({
      id: nanoid(),
      userId: user.id,
      token,
      expiresAt,
      attempts: 0,
    });

    // Generate email content
    const { subject, html, text } = generatePasswordResetEmail(token);

    // Send email via Resend
    const { error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || "Automaatje"} <${process.env.RESEND_FROM_EMAIL}>`,
      to: user.email,
      subject,
      html,
      text,
      tags: [
        { name: "type", value: "password_reset" },
        { name: "user_id", value: user.id },
      ],
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return {
        success: false,
        error: "Er is een fout opgetreden bij het versturen van de e-mail",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return {
      success: false,
      error: "Er is een fout opgetreden. Probeer het later opnieuw.",
    };
  }
}

/**
 * Verify reset token and update password
 */
export async function verifyResetToken(
  input: VerifyResetInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = verifyResetSchema.parse(input);

    // Look up user by email
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, validated.email))
      .limit(1);

    if (users.length === 0) {
      return {
        success: false,
        error: "Ongeldige code of e-mailadres",
      };
    }

    const user = users[0];

    // Find token
    const tokens = await db
      .select()
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.userId, user.id),
          eq(schema.passwordResetTokens.token, validated.token)
        )
      )
      .limit(1);

    if (tokens.length === 0) {
      return {
        success: false,
        error: "Ongeldige code",
      };
    }

    const tokenRecord = tokens[0];

    // Check if token has expired
    if (new Date() > tokenRecord.expiresAt) {
      // Clean up expired token
      await db
        .delete(schema.passwordResetTokens)
        .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

      return {
        success: false,
        error: "Code is verlopen. Vraag een nieuwe code aan.",
      };
    }

    // Check attempts (max 3)
    if (tokenRecord.attempts >= 3) {
      // Clean up token after too many attempts
      await db
        .delete(schema.passwordResetTokens)
        .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

      return {
        success: false,
        error: "Te veel pogingen. Vraag een nieuwe code aan.",
      };
    }

    // Increment attempts
    await db
      .update(schema.passwordResetTokens)
      .set({ attempts: tokenRecord.attempts + 1 })
      .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

    // Hash new password
    const passwordHash = await hashPassword(validated.password);

    // Update user password
    await db
      .update(schema.users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    // Delete the used token (and any other tokens for this user)
    await cleanupExpiredTokens(user.id);

    return { success: true };
  } catch (error) {
    console.error("Password reset verification error:", error);

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
