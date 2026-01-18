/**
 * Vehicle tracking mode utilities
 *
 * This module provides utilities for working with per-vehicle tracking modes.
 * Two modes are supported:
 * - full_registration: Complete audit trail for lease/company cars
 * - simple_reimbursement: Distance-only tracking for employer reimbursement
 */

export type VehicleTrackingMode = "full_registration" | "simple_reimbursement";

/**
 * Get the tracking mode for a vehicle
 * Defaults to "full_registration" for backward compatibility
 */
export function getVehicleTrackingMode(vehicle: {
  details: Record<string, unknown>;
}): VehicleTrackingMode {
  const mode = (vehicle.details as any).trackingMode;
  return mode === "simple_reimbursement" ? "simple_reimbursement" : "full_registration";
}

/**
 * Get display label for tracking mode (Dutch)
 */
export function getModeLabel(mode: VehicleTrackingMode): string {
  return mode === "full_registration"
    ? "Volledige ritregistratie"
    : "Eenvoudige kilometervergoeding";
}

/**
 * Get short display label for tracking mode (Dutch)
 */
export function getModeLabelShort(mode: VehicleTrackingMode): string {
  return mode === "full_registration" ? "Volledig" : "Eenvoudig";
}

/**
 * Get description for tracking mode (Dutch)
 */
export function getModeDescription(mode: VehicleTrackingMode): string {
  return mode === "full_registration"
    ? "Voor leaseauto's en bedrijfswagens (gesloten kilometerstand, adressen verplicht)"
    : "Voor woon-werk kilometers (alleen afstand, geen adressen vereist)";
}

/**
 * Get detailed explanation for tracking mode (Dutch)
 */
export function getModeExplanation(mode: VehicleTrackingMode): string {
  if (mode === "full_registration") {
    return "Volledige ritregistratie is vereist voor zakelijke auto's om te voldoen aan Nederlandse belastingregels. Je moet gesloten kilometerstand en adressen bijhouden.";
  } else {
    return "Eenvoudige kilometervergoeding is bedoeld voor woon-werk kilometers. Je hoeft alleen de afstand in te vullen die je werkgever vergoedt.";
  }
}

/**
 * Get form help text for tracking mode (Dutch)
 */
export function getModeFormHelpText(mode: VehicleTrackingMode): string {
  if (mode === "full_registration") {
    return "Dit voertuig vereist volledige ritregistratie met gesloten kilometerstand en adressen.";
  } else {
    return "Voor dit voertuig hoef je alleen de gereden kilometers in te vullen.";
  }
}

/**
 * Check if a tracking mode requires odometer readings
 */
export function requiresOdometer(mode: VehicleTrackingMode): boolean {
  return mode === "full_registration";
}

/**
 * Check if a tracking mode requires addresses
 */
export function requiresAddresses(mode: VehicleTrackingMode): boolean {
  return mode === "full_registration";
}

/**
 * Check if a tracking mode requires distance input
 */
export function requiresDistance(mode: VehicleTrackingMode): boolean {
  return mode === "simple_reimbursement";
}

/**
 * Get the badge variant for a tracking mode
 */
export function getModeBadgeVariant(mode: VehicleTrackingMode): "default" | "secondary" {
  return mode === "full_registration" ? "default" : "secondary";
}
