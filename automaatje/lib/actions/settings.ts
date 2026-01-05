"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/actions/auth";
import { z } from "zod";

/**
 * Mileage rate configuration type
 */
export type MileageRateConfig = {
  userPreference: "standard" | "custom" | "none";
  customRatePerKm?: number;
};

/**
 * Standard mileage rates type
 */
export type StandardMileageRates = {
  rates: Array<{
    country: string;
    year: number;
    businessRate: number;
    description: string;
  }>;
  fallbackCountry: string;
  fallbackRate: number;
};

/**
 * Validation schema for updating mileage rates
 */
const updateMileageRateSchema = z.object({
  rateType: z.enum(["standard", "custom", "none"]),
  customRate: z.number().min(0).max(10).optional(),
});

/**
 * Get current mileage rate configuration
 */
export async function getMileageRateConfig(): Promise<{
  success: boolean;
  data?: MileageRateConfig;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const setting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "mileage_rate_config"))
      .limit(1);

    if (setting.length === 0) {
      // Return default configuration
      return {
        success: true,
        data: {
          userPreference: "standard",
          customRatePerKm: undefined,
        },
      };
    }

    return {
      success: true,
      data: setting[0].value as MileageRateConfig,
    };
  } catch (error) {
    console.error("Error fetching mileage rate config:", error);
    return {
      success: false,
      error: "Fout bij ophalen van kilometertarieven",
    };
  }
}

/**
 * Get standard mileage rates
 */
export async function getStandardMileageRates(): Promise<{
  success: boolean;
  data?: StandardMileageRates;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const setting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "standard_mileage_rates"))
      .limit(1);

    if (setting.length === 0) {
      // Return default rates
      return {
        success: true,
        data: {
          rates: [
            {
              country: "NL",
              year: 2026,
              businessRate: 0.23,
              description: "Belastingvrije kilometervergoeding 2026",
            },
          ],
          fallbackCountry: "NL",
          fallbackRate: 0.23,
        },
      };
    }

    return {
      success: true,
      data: setting[0].value as StandardMileageRates,
    };
  } catch (error) {
    console.error("Error fetching standard mileage rates:", error);
    return {
      success: false,
      error: "Fout bij ophalen van standaardtarieven",
    };
  }
}

/**
 * Update mileage rate configuration
 */
export async function updateMileageRateConfig(data: {
  rateType: "standard" | "custom" | "none";
  customRate?: number;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = updateMileageRateSchema.parse(data);

    // Validate custom rate if type is custom
    if (validated.rateType === "custom") {
      if (!validated.customRate || validated.customRate <= 0) {
        return {
          success: false,
          error: "Aangepast tarief moet groter zijn dan 0",
        };
      }
    }

    // Prepare the config object
    const config: MileageRateConfig = {
      userPreference: validated.rateType,
      customRatePerKm: validated.customRate,
    };

    // Check if setting exists
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "mileage_rate_config"))
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(schema.settings)
        .set({
          value: config,
          updatedAt: new Date(),
        })
        .where(eq(schema.settings.key, "mileage_rate_config"));
    } else {
      // Insert new setting
      await db.insert(schema.settings).values({
        key: "mileage_rate_config",
        value: config,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating mileage rate config:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Ongeldige invoer: " + error.issues[0].message,
      };
    }

    return {
      success: false,
      error: "Fout bij opslaan van kilometertarieven",
    };
  }
}

/**
 * Add or update a standard mileage rate
 * Allows authenticated users to manage standard rates for future years
 */
export async function updateStandardRate(data: {
  country: string;
  year: number;
  businessRate: number;
  description: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Get current standard rates
    const result = await getStandardMileageRates();
    if (!result.success || !result.data) {
      return { success: false, error: "Kon standaardtarieven niet ophalen" };
    }

    const standardRates = result.data;

    // Find if rate for this country/year exists
    const existingIndex = standardRates.rates.findIndex(
      (r) => r.country === data.country && r.year === data.year
    );

    if (existingIndex >= 0) {
      // Update existing rate
      standardRates.rates[existingIndex] = data;
    } else {
      // Add new rate
      standardRates.rates.push(data);
    }

    // Sort rates by year descending, then by country
    standardRates.rates.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.country.localeCompare(b.country);
    });

    // Update the setting
    await db
      .update(schema.settings)
      .set({
        value: standardRates,
        updatedAt: new Date(),
      })
      .where(eq(schema.settings.key, "standard_mileage_rates"));

    return { success: true };
  } catch (error) {
    console.error("Error updating standard rate:", error);
    return {
      success: false,
      error: "Fout bij opslaan van standaardtarief",
    };
  }
}

/**
 * Get registration enabled status
 */
export async function getRegistrationsEnabled(): Promise<{
  success: boolean;
  data?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const setting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "registrations_enabled"))
      .limit(1);

    if (setting.length === 0) {
      // Default: registrations enabled
      return {
        success: true,
        data: true,
      };
    }

    const config = setting[0].value as { enabled?: boolean };
    return {
      success: true,
      data: config.enabled !== false,
    };
  } catch (error) {
    console.error("Error fetching registrations enabled:", error);
    return {
      success: false,
      error: "Fout bij ophalen van registratie-instelling",
    };
  }
}

/**
 * Update registration enabled status (admin only)
 */
export async function updateRegistrationsSetting(
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Alleen beheerders kunnen deze instelling wijzigen" };
    }

    // Check if setting exists
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "registrations_enabled"))
      .limit(1);

    const config = { enabled };

    if (existing.length === 0) {
      // Create new setting
      await db.insert(schema.settings).values({
        key: "registrations_enabled",
        value: config as any,
        updatedAt: new Date(),
      });
    } else {
      // Update existing setting
      await db
        .update(schema.settings)
        .set({
          value: config as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.settings.key, "registrations_enabled"));
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating registrations setting:", error);
    return {
      success: false,
      error: "Fout bij opslaan van registratie-instelling",
    };
  }
}
