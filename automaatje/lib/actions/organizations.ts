"use server";

import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/actions/auth";
import { organizationSchema } from "@/lib/validations/organization";
import { nanoid } from "nanoid";

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all organizations for the current user
 */
export async function getOrganizations(): Promise<
  ActionResult<Array<{ id: string; name: string; createdAt: Date }>>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const organizations = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        createdAt: schema.organizations.createdAt,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.userId, user.id))
      .orderBy(schema.organizations.name);

    return {
      success: true,
      data: organizations,
    };
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return {
      success: false,
      error: "Fout bij ophalen van organisaties",
    };
  }
}

/**
 * Add a new organization for the current user
 */
export async function addOrganization(data: {
  name: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = organizationSchema.parse(data);

    // Check for duplicate organization name for this user
    const existing = await db
      .select()
      .from(schema.organizations)
      .where(
        and(
          eq(schema.organizations.userId, user.id),
          eq(schema.organizations.name, validated.name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "Deze organisatie bestaat al",
      };
    }

    // Create new organization
    const orgId = nanoid();
    await db.insert(schema.organizations).values({
      id: orgId,
      userId: user.id,
      name: validated.name,
    });

    return {
      success: true,
      data: {
        id: orgId,
        name: validated.name,
      },
    };
  } catch (error) {
    console.error("Error adding organization:", error);
    if (error instanceof Error && error.message.includes("is verplicht")) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Fout bij toevoegen van organisatie",
    };
  }
}

/**
 * Update an organization
 */
export async function updateOrganization(
  id: string,
  data: {
    name: string;
  }
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = organizationSchema.parse(data);

    // Verify organization belongs to user
    const organization = await db
      .select()
      .from(schema.organizations)
      .where(
        and(
          eq(schema.organizations.id, id),
          eq(schema.organizations.userId, user.id)
        )
      )
      .limit(1);

    if (organization.length === 0) {
      return {
        success: false,
        error: "Organisatie niet gevonden",
      };
    }

    // Check for duplicate organization name (excluding current organization)
    const existing = await db
      .select()
      .from(schema.organizations)
      .where(
        and(
          eq(schema.organizations.userId, user.id),
          eq(schema.organizations.name, validated.name)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      return {
        success: false,
        error: "Deze organisatie naam bestaat al",
      };
    }

    // Update organization
    await db
      .update(schema.organizations)
      .set({
        name: validated.name,
      })
      .where(
        and(
          eq(schema.organizations.id, id),
          eq(schema.organizations.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error updating organization:", error);
    if (error instanceof Error && error.message.includes("is verplicht")) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Fout bij bijwerken van organisatie",
    };
  }
}

/**
 * Delete an organization
 * Only allows deletion if no registrations are linked to it
 */
export async function deleteOrganization(
  id: string
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Verify organization belongs to user
    const organization = await db
      .select()
      .from(schema.organizations)
      .where(
        and(
          eq(schema.organizations.id, id),
          eq(schema.organizations.userId, user.id)
        )
      )
      .limit(1);

    if (organization.length === 0) {
      return {
        success: false,
        error: "Organisatie niet gevonden",
      };
    }

    // Check if any registrations reference this organization
    const registrations = await db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.userId, user.id))
      .all();

    const hasLinkedRegistrations = registrations.some((reg) => {
      const data = reg.data as { organizationId?: string };
      return data.organizationId === id;
    });

    if (hasLinkedRegistrations) {
      return {
        success: false,
        error:
          "Deze organisatie kan niet verwijderd worden omdat er nog registraties aan gekoppeld zijn",
      };
    }

    // Delete organization
    await db
      .delete(schema.organizations)
      .where(
        and(
          eq(schema.organizations.id, id),
          eq(schema.organizations.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting organization:", error);
    return {
      success: false,
      error: "Fout bij verwijderen van organisatie",
    };
  }
}
