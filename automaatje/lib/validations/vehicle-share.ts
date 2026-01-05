import { z } from "zod";

/**
 * Vehicle sharing validation schemas
 * Enables users to share their vehicles with other users
 */

export const createVehicleShareSchema = z.object({
  vehicleId: z.string().min(1, { message: "Selecteer een voertuig" }),
  sharedWithEmail: z
    .string()
    .email({ message: "Ongeldig e-mailadres" })
    .min(1, { message: "E-mailadres is verplicht" }),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  note: z.string().max(500, { message: "Notitie mag maximaal 500 tekens bevatten" }).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const updateVehicleShareSchema = z.object({
  shareId: z.string().min(1, { message: "Share ID is verplicht" }),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  note: z.string().max(500, { message: "Notitie mag maximaal 500 tekens bevatten" }).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const deleteVehicleShareSchema = z.object({
  shareId: z.string().min(1, { message: "Share ID is verplicht" }),
});

export type CreateVehicleShareInput = z.infer<typeof createVehicleShareSchema>;
export type UpdateVehicleShareInput = z.infer<typeof updateVehicleShareSchema>;
export type DeleteVehicleShareInput = z.infer<typeof deleteVehicleShareSchema>;
