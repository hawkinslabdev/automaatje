import { z } from "zod";

/**
 * Enhanced registration schema that meets Dutch tax authority requirements
 *
 * Legal requirements (NL):
 * - Date, starting/ending mileage
 * - Departure and arrival addresses
 * - Trip purpose (zakelijk/privé)
 * - Alternative route description (optional)
 * - Private detour kilometres for mixed journeys (optional)
 */

// Address schema for departure and destination
const addressSchema = z.object({
  text: z.string().min(1, { message: "Adres is verplicht" }),
  lat: z.number().optional(),
  lon: z.number().optional(),
  timestamp: z.coerce.number().optional(),
});

export const createRegistrationSchema = z.object({
  vehicleId: z.string().min(1, { message: "Selecteer een voertuig" }),

  // Timestamp (trip start)
  timestamp: z.coerce.date({
    message: "Ongeldige datum",
  }),

  // Odometer readings (required by NL tax authority)
  // Note: 0 is allowed as trigger value for auto-calculate mode
  startOdometerKm: z.coerce
    .number({
      message: "Kilometerstand moet een getal zijn",
    })
    .int({ message: "Kilometerstand moet een geheel getal zijn" })
    .nonnegative({ message: "Kilometerstand kan niet negatief zijn" }),

  endOdometerKm: z.coerce
    .number({
      message: "Eindstand moet een getal zijn",
    })
    .int({ message: "Eindstand moet een geheel getal zijn" })
    .positive({ message: "Eindstand moet positief zijn" })
    .optional()
    .nullable(),

  // Trip purpose (required by NL tax authority)
  tripType: z.enum(["zakelijk", "privé"], {
    message: "Selecteer een rittype",
  }),

  // Departure address (required by NL tax authority)
  departure: addressSchema,

  // Destination address (required by NL tax authority)
  destination: addressSchema,

  // Distance (can be calculated or manual)
  distanceKm: z.coerce
    .number({
      message: "Afstand moet een getal zijn",
    })
    .positive({ message: "Afstand moet positief zijn" })
    .optional()
    .nullable(),

  calculationMethod: z.enum(["osrm", "manual", "odometer"]).optional(),

  // Optional description
  description: z.string().optional(),

  // Alternative route & detours (optional, for NL tax compliance)
  alternativeRoute: z.string().optional(),
  privateDetourKm: z.coerce
    .number({
      message: "Private omrijkilometers moet een getal zijn",
    })
    .nonnegative({ message: "Private omrijkilometers moet positief zijn" })
    .optional()
    .nullable(),

  // Trip linking (for paired outward/return journeys)
  linkedTripId: z.string().optional(),
  tripDirection: z.enum(["heenreis", "terugreis"]).optional(),
});

/**
 * Simplified schema for odometer-only entries
 * Used when just recording the current odometer reading
 */
export const createOdometerEntrySchema = z.object({
  vehicleId: z.string().min(1, { message: "Selecteer een voertuig" }),
  timestamp: z.coerce.date({
    message: "Ongeldige datum",
  }),
  startOdometerKm: z.coerce
    .number({
      message: "Kilometerstand moet een getal zijn",
    })
    .int({ message: "Kilometerstand moet een geheel getal zijn" })
    .positive({ message: "Kilometerstand moet positief zijn" }),
  description: z.string().optional(),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type CreateOdometerEntryInput = z.infer<typeof createOdometerEntrySchema>;
