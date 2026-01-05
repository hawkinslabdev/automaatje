"use server";

import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/actions/auth";
import { labelSchema } from "@/lib/validations/label";
import { nanoid } from "nanoid";

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all labels for the current user
 */
export async function getLabels(): Promise<
  ActionResult<Array<{ id: string; name: string; color: string; createdAt: Date }>>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const labels = await db
      .select({
        id: schema.labels.id,
        name: schema.labels.name,
        color: schema.labels.color,
        createdAt: schema.labels.createdAt,
      })
      .from(schema.labels)
      .where(eq(schema.labels.userId, user.id))
      .orderBy(schema.labels.name);

    return {
      success: true,
      data: labels,
    };
  } catch (error) {
    console.error("Error fetching labels:", error);
    return {
      success: false,
      error: "Fout bij ophalen van labels",
    };
  }
}

/**
 * Add a new label for the current user
 */
export async function addLabel(data: {
  name: string;
  color: string;
}): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = labelSchema.parse(data);

    // Check for duplicate label name for this user
    const existing = await db
      .select()
      .from(schema.labels)
      .where(
        and(
          eq(schema.labels.userId, user.id),
          eq(schema.labels.name, validated.name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "Deze label bestaat al",
      };
    }

    // Create new label
    const labelId = nanoid();
    await db.insert(schema.labels).values({
      id: labelId,
      userId: user.id,
      name: validated.name,
      color: validated.color,
    });

    return {
      success: true,
      data: {
        id: labelId,
        name: validated.name,
        color: validated.color,
      },
    };
  } catch (error) {
    console.error("Error adding label:", error);
    if (error instanceof Error && error.message.includes("is verplicht")) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Fout bij toevoegen van label",
    };
  }
}

/**
 * Update a label
 */
export async function updateLabel(
  id: string,
  data: {
    name: string;
    color: string;
  }
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = labelSchema.parse(data);

    // Verify label belongs to user
    const label = await db
      .select()
      .from(schema.labels)
      .where(
        and(
          eq(schema.labels.id, id),
          eq(schema.labels.userId, user.id)
        )
      )
      .limit(1);

    if (label.length === 0) {
      return {
        success: false,
        error: "Label niet gevonden",
      };
    }

    // Check for duplicate label name (excluding current label)
    const existing = await db
      .select()
      .from(schema.labels)
      .where(
        and(
          eq(schema.labels.userId, user.id),
          eq(schema.labels.name, validated.name)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      return {
        success: false,
        error: "Deze label naam bestaat al",
      };
    }

    // Update label
    await db
      .update(schema.labels)
      .set({
        name: validated.name,
        color: validated.color,
      })
      .where(
        and(
          eq(schema.labels.id, id),
          eq(schema.labels.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error updating label:", error);
    if (error instanceof Error && error.message.includes("is verplicht")) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Fout bij bijwerken van label",
    };
  }
}

/**
 * Delete a label
 * Only allows deletion if no registrations are linked to it
 */
export async function deleteLabel(
  id: string
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Verify label belongs to user
    const label = await db
      .select()
      .from(schema.labels)
      .where(
        and(
          eq(schema.labels.id, id),
          eq(schema.labels.userId, user.id)
        )
      )
      .limit(1);

    if (label.length === 0) {
      return {
        success: false,
        error: "Label niet gevonden",
      };
    }

    // Check if any registrations reference this label
    const registrations = await db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.userId, user.id))
      .all();

    const hasLinkedRegistrations = registrations.some((reg) => {
      const data = reg.data as { labelIds?: string[] };
      return data.labelIds?.includes(id);
    });

    if (hasLinkedRegistrations) {
      return {
        success: false,
        error:
          "Deze label kan niet verwijderd worden omdat er nog registraties aan gekoppeld zijn",
      };
    }

    // Delete label
    await db
      .delete(schema.labels)
      .where(
        and(
          eq(schema.labels.id, id),
          eq(schema.labels.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting label:", error);
    return {
      success: false,
      error: "Fout bij verwijderen van label",
    };
  }
}
