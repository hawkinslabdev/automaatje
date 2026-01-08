import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

/**
 * Users table - NoSQL-like with JSON columns for flexible data
 * Stores user authentication and profile data
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("USER"), // "ADMIN" | "USER"

  // Profile data stored as JSON for flexibility
  profile: text("profile", { mode: "json" }).$type<{
    name: string;
    avatarSeed?: string; // DiceBear avatar seed (Aidan, Maria, Nolan, Mason, Sarah, Brian)
    location?: {
      text?: string;
      lat?: number;
      lon?: number;
      country?: string; // User's home country for address formatting
    };
    favoriteLocations?: Array<{
      id: string;
      text: string;
      lat?: number;
      lon?: number;
      addedAt: number;
    }>;
  }>().notNull(),

  // Additional metadata stored as JSON
  metadata: text("metadata", { mode: "json" }).$type<{
    isActive?: boolean;
    lastLoginAt?: number;
    preferences?: {
      // Notification preferences
      notifications?: {
        // Channel toggles
        channels?: {
          inbox?: boolean;           // Default: true
          email?: boolean;           // Default: false (opt-in)
          webhook?: boolean;         // Default: false (opt-in)
          apprise?: boolean;         // Default: false (opt-in)
        };

        // Per-type preferences
        types?: {
          report_generated?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox" | "email" | "webhook" | "apprise">;
            frequency?: "immediate" | "daily_digest" | "weekly_digest";
          };
          odometer_milestone?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox" | "email">;
            milestones?: number[];   // e.g., [10000, 20000, 50000, 100000]
          };
          maintenance_reminder?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox" | "email">;
            advanceDays?: number;    // Default: 7 days before
          };
          shared_vehicle?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox">;
          };
          incomplete_trip?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox">;
            reminderAfterDays?: number; // Default: 3 days
          };
          system_announcement?: {
            enabled?: boolean;       // Default: true
            channels?: Array<"inbox">;
          };
        };

        // Global settings
        quietHours?: {
          enabled?: boolean;
          start?: string;            // e.g., "22:00"
          end?: string;              // e.g., "08:00"
          timezone?: string;         // e.g., "Europe/Amsterdam"
        };

        // Delivery configuration
        email?: {
          address?: string;          // Override user's primary email
          verificationStatus?: "pending" | "verified";
          verificationToken?: string; // For email verification
          digestSchedule?: string;   // When to send daily digest (e.g., "08:00")
        };

        webhook?: {
          url?: string;              // Webhook endpoint
          secret?: string;           // HMAC signature secret
          headers?: Record<string, string>; // Custom headers
          verificationStatus?: "pending" | "verified";
        };

        apprise?: {
          urls?: string[];           // Apprise notification URLs
          verificationStatus?: "pending" | "verified";
        };
      };

      // Odometer tracking preferences
      odometerTracking?: {
        mode?: "manual" | "auto_calculate";           // Default: "manual"
        defaultFrequency?: "dagelijks" | "wekelijks" | "maandelijks"; // For auto-calculate
        lastReminderSent?: number;                     // Timestamp of last reminder
        notificationsEnabled?: boolean;                // Default: true
      };

      // Edit restrictions preferences
      editRestrictions?: {
        enabled?: boolean;                             // Default: true (restrictions enabled)
        maxDaysBack?: number;                          // Default: 30 days
      };

      // Other general preferences
      [key: string]: unknown;
    };
  }>().default(sql`'{}'`),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Vehicles table - Vehicle data with JSON columns
 */
export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  licensePlate: text("license_plate").notNull(),

  // Vehicle details stored as JSON
  details: text("details", { mode: "json" }).$type<{
    naamVoertuig?: string;
    type: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
    land: string;
    kilometerstandTracking?: "niet_registreren" | "dagelijks" | "wekelijks" | "maandelijks";
    isMain?: boolean;
    isEnabled?: boolean;
    make?: string;
    model?: string;
    year?: number;
    detailsStatus?: "PENDING" | "READY" | "FAILED";
    fetchError?: string;
    // @deprecated No longer used - initial odometer is now stored as meterstand registration entry
    // Kept for backward compatibility with existing data
    initialOdometerKm?: number;
    initialOdometerDate?: number; // Timestamp when initial reading was taken
  }>().notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Vehicle Shares table - Tracks which users can use which vehicles
 * Enables vehicle sharing between users
 */
export const vehicleShares = sqliteTable("vehicle_shares", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWithUserId: text("shared_with_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Share metadata
  metadata: text("metadata", { mode: "json" }).$type<{
    canEdit?: boolean; // Can the shared user edit vehicle details
    canDelete?: boolean; // Can the shared user delete trips
    note?: string; // Optional note about the share
    expiresAt?: number; // Optional expiration timestamp
  }>().default(sql`'{}'`),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Organizations table - Company names for business trip reporting
 * User-specific organizations that can be linked to registrations
 */
export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Labels table - Tags for categorizing trips
 * User-specific labels that can be linked to registrations
 */
export const labels = sqliteTable("labels", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#808080"), // Hex color code
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Registrations table - Trip/mileage registration data
 * Enhanced to meet Dutch tax authority requirements (Belastingdienst)
 *
 * Legal requirements (NL):
 * - Date, starting/ending mileage
 * - Departure and arrival addresses
 * - Outward and return journeys are separate
 * - Alternative route description
 * - Private or business trip indicator
 * - Private detour kilometres for mixed journeys
 */
export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),

  // Trip data stored as JSON for maximum flexibility
  data: text("data", { mode: "json" }).$type<{
    // Basic trip information
    timestamp: number; // Trip start time

    // Odometer readings (required by NL tax authority)
    startOdometerKm: number; // Starting mileage
    endOdometerKm?: number; // Ending mileage (optional for ongoing trips)

    // Trip purpose (required by NL tax authority)
    tripType: "zakelijk" | "privé"; // Business, private

    // Departure address (required by NL tax authority)
    departure: {
      text: string; // Full address text
      lat?: number; // Latitude
      lon?: number; // Longitude
      timestamp?: number; // Departure time (if different from trip start)
    };

    // Arrival/destination address (required by NL tax authority)
    destination: {
      text: string; // Full address text
      lat?: number; // Latitude
      lon?: number; // Longitude
      timestamp?: number; // Arrival time
    };

    // Distance information
    distanceKm?: number; // Calculated or manual distance
    calculationMethod?: "osrm" | "manual" | "odometer"; // How distance was determined

    // Optional description
    description?: string; // Trip purpose/notes

    // Alternative route & detours (for NL tax compliance)
    alternativeRoute?: string; // Description of alternative route taken
    privateDetourKm?: number; // Private detour kilometers for mixed journeys

    // Trip linking (for paired outward/return journeys)
    linkedTripId?: string; // ID of related trip (e.g., return journey)
    tripDirection?: "heenreis" | "terugreis"; // Outward or return journey

    // Completion tracking
    isIncomplete?: boolean; // True if trip is missing critical data (end odometer or distance)

    // Auto-calculation metadata (for auto-calculate mode)
    odometerCalculated?: boolean; // True if start/end were automatically calculated
    calculationBasedOn?: {
      previousMeterstandId?: string; // ID of previous meterstand entry used
      nextMeterstandId?: string;     // ID of next meterstand entry used
      interpolationMethod?: "linear"; // Calculation method used
    };

    // Organization/company link for reporting
    organizationId?: string; // Reference to organizations.id

    // Labels for categorization
    labelIds?: string[]; // Array of label IDs

    // Room for future fields without migration
    customFields?: Record<string, unknown>;
  }>().notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Settings table - Key-value store with JSON values
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Background Jobs table - Generic job queue system
 * Supports various job types: RDW lookup, notifications, reports, etc.
 */
export const backgroundJobs = sqliteTable("background_jobs", {
  id: text("id").primaryKey(),

  // Job type determines which handler processes this job
  type: text("type").notNull(), // "rdw_lookup" | "notification" | "report_generation" | ...

  // Job status tracking
  status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"

  // Job payload - flexible JSON for different job types
  payload: text("payload", { mode: "json" }).$type<{
    // For RDW lookup
    vehicleId?: string;
    licensePlate?: string;

    // For notifications
    userId?: string;
    notificationType?: string;
    notificationData?: Record<string, unknown>;

    // For report generation
    reportType?: string;
    reportParams?: Record<string, unknown>;

    // Generic payload for future job types
    [key: string]: unknown;
  }>().notNull(),

  // Result data (populated after job completion)
  result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),

  // Error information (populated on failure)
  error: text("error"),

  // Retry tracking
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),

  // Scheduling
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }), // When to run (null = immediately)
  startedAt: integer("started_at", { mode: "timestamp" }), // When processing started
  completedAt: integer("completed_at", { mode: "timestamp" }), // When job finished

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Notifications table - In-app notification system (postvak/inbox)
 * Stores all user notifications with flexible metadata for different notification types
 */
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Notification metadata stored as JSON for flexibility
  data: text("data", { mode: "json" }).$type<{
    // Core fields
    type:
      | "report_generated"        // Automated report ready
      | "odometer_milestone"      // Car reached milestone
      | "odometer_reminder"       // Reminder to enter odometer reading
      | "maintenance_reminder"    // Maintenance due
      | "shared_vehicle"          // Vehicle shared with you
      | "incomplete_trip"         // Trip missing data
      | "system_announcement"     // System-wide message
      | "custom";                 // Admin custom notification

    title: string;                // Notification title (Dutch)
    message: string;              // Notification body (Dutch)

    // Optional fields
    priority?: "low" | "normal" | "high" | "urgent";
    icon?: string;                // Lucide icon name (e.g., "FileText", "Trophy")
    color?: string;               // Badge/indicator color (e.g., "blue", "yellow", "red")

    // Action links
    action?: {
      label: string;              // e.g., "Rapport bekijken"
      url: string;                // e.g., "/rapporten/jaar?id=123"
    };

    // Related entities (for linking to vehicles, trips, reports)
    relatedVehicleId?: string;    // Link to vehicle
    relatedRegistrationId?: string; // Link to trip
    relatedReportId?: string;     // Link to report

    // Delivery tracking (which channels were used)
    deliveredVia?: Array<"inbox" | "email" | "webhook" | "apprise">;
    deliveryErrors?: Record<string, string>; // Channel → error message

    // Extensibility for future notification types
    customData?: Record<string, unknown>;
  }>().notNull(),

  // Status tracking
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),

  // Timestamps
  readAt: integer("read_at", { mode: "timestamp" }),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }), // Auto-delete after this date

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Password Reset Tokens table - Stores temporary codes for password reset
 * Tokens expire after 15 minutes for security
 */
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(), // 6-digit verification code
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  attempts: integer("attempts").notNull().default(0), // Max 3 attempts before invalidation
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  registrations: many(registrations),
  ownedVehicleShares: many(vehicleShares, { relationName: "owner" }),
  sharedVehicles: many(vehicleShares, { relationName: "sharedWith" }),
  notifications: many(notifications),
  organizations: many(organizations),
  labels: many(labels),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  registrations: many(registrations),
  shares: many(vehicleShares),
}));

export const vehicleSharesRelations = relations(vehicleShares, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleShares.vehicleId],
    references: [vehicles.id],
  }),
  owner: one(users, {
    fields: [vehicleShares.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  sharedWith: one(users, {
    fields: [vehicleShares.sharedWithUserId],
    references: [users.id],
    relationName: "sharedWith",
  }),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [registrations.vehicleId],
    references: [vehicles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one }) => ({
  user: one(users, {
    fields: [organizations.userId],
    references: [users.id],
  }),
}));

export const labelsRelations = relations(labels, ({ one }) => ({
  user: one(users, {
    fields: [labels.userId],
    references: [users.id],
  }),
}));

// TypeScript types derived from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type VehicleShare = typeof vehicleShares.$inferSelect;
export type NewVehicleShare = typeof vehicleShares.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type NewBackgroundJob = typeof backgroundJobs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
