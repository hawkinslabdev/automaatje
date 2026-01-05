/**
 * Registration Type Detection Utilities
 *
 * Provides centralized logic for distinguishing between trip registrations
 * and meterstand (odometer-only) entries.
 *
 * Legal Compliance Note:
 * Dutch tax authority (Belastingdienst) requires JOURNEYS to have actual
 * departure/arrival addresses. Meterstand entries are NOT journeys - they're
 * periodic odometer readings and must be treated separately.
 */

export const METERSTAND_PLACEHOLDER = "Kilometerstand registratie";

export type RegistrationType = "trip" | "meterstand";

/**
 * Determine the type of a registration
 *
 * @param registration - Registration object with data field
 * @returns "trip" or "meterstand"
 */
export function getRegistrationType(registration: any): RegistrationType {
  const data = registration.data;

  // Explicit type (for new entries created after this implementation)
  if (data.type) {
    return data.type;
  }

  // Backward compatibility: detect meterstand entries by placeholder text
  // Meterstand entries created via /registraties/meterstand use this placeholder
  if (
    data.departure?.text === METERSTAND_PLACEHOLDER &&
    data.destination?.text === METERSTAND_PLACEHOLDER
  ) {
    return "meterstand";
  }

  // Default to trip for all other registrations
  return "trip";
}

/**
 * Check if a registration is a meterstand entry
 *
 * @param registration - Registration object
 * @returns true if meterstand entry, false otherwise
 */
export function isMeterstandEntry(registration: any): boolean {
  return getRegistrationType(registration) === "meterstand";
}

/**
 * Check if a registration is a trip entry
 *
 * @param registration - Registration object
 * @returns true if trip entry, false otherwise
 */
export function isTripEntry(registration: any): boolean {
  return getRegistrationType(registration) === "trip";
}
