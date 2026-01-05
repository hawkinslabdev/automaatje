"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { getRandomAvatarSeed } from "@/lib/avatar";

export async function login(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // Validate input
    const validated = loginSchema.parse(rawData);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, validated.email),
    });

    if (!user) {
      return { success: false, error: "Ongeldig e-mailadres of wachtwoord" };
    }

    // Verify password
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Ongeldig e-mailadres of wachtwoord" };
    }

    // Check if user is active
    if (user.metadata && typeof user.metadata === 'object' && 'isActive' in user.metadata && user.metadata.isActive === false) {
      return { success: false, error: "Account is gedeactiveerd" };
    }

    // Create session
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.role = user.role as "ADMIN" | "USER";
    session.isLoggedIn = true;
    await session.save();

    // Update last login
    await db
      .update(schema.users)
      .set({
        metadata: {
          ...((user.metadata as Record<string, unknown>) || {}),
          lastLoginAt: Date.now(),
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Er is een fout opgetreden bij inloggen" };
  }
}

export async function register(formData: FormData) {
  try {
    const rawData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    // Validate input
    const validated = registerSchema.parse(rawData);

    // Check if registrations are enabled (except for first user)
    const userCount = await db
      .select({ count: schema.users.id })
      .from(schema.users);

    if (userCount.length > 0) {
      const settings = await db.query.settings.findFirst({
        where: eq(schema.settings.key, "registrations_enabled"),
      });

      const isEnabled = settings?.value && typeof settings.value === 'object' && 'enabled' in settings.value
        ? settings.value.enabled
        : false;

      if (!isEnabled) {
        return {
          success: false,
          error:
            "Registratie is uitgeschakeld. Neem contact op met de beheerder.",
        };
      }
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, validated.email),
    });

    if (existingUser) {
      return { success: false, error: "E-mailadres is al in gebruik" };
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Determine role (first user is admin)
    const isFirstUser = userCount.length === 0;
    const role = isFirstUser ? "ADMIN" : "USER";

    // Create user
    const userId = nanoid();
    await db.insert(schema.users).values({
      id: userId,
      email: validated.email,
      passwordHash,
      role,
      profile: {
        name: validated.name,
        avatarSeed: getRandomAvatarSeed(),
      },
      metadata: {
        isActive: true,
      },
    });

    // Enable registrations by default for first user
    if (isFirstUser) {
      await db.insert(schema.settings).values({
        key: "registrations_enabled",
        value: { enabled: true },
      });
    }

    // Auto-login after registration
    const session = await getSession();
    session.userId = userId;
    session.email = validated.email;
    session.role = role;
    session.isLoggedIn = true;
    await session.save();

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Er is een fout opgetreden bij registreren",
    };
  }
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    // If user doesn't exist in database but session claims they're logged in,
    // the session is stale (e.g., database was reset).
    // We can't clear the session here (not in a Server Action),
    // so just return null and let middleware/layout handle the redirect.
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      metadata: user.metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}
