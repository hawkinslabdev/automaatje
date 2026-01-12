CREATE TABLE `live_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`status` text DEFAULT 'RECORDING' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`start_lat` real NOT NULL,
	`start_lon` real NOT NULL,
	`start_address` text,
	`end_lat` real,
	`end_lon` real,
	`end_address` text,
	`distance_km` real,
	`duration_seconds` integer,
	`route_geojson` text,
	`trip_type` text,
	`notes` text,
	`private_detour_km` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `source_trip_id` text REFERENCES live_trips(id);--> statement-breakpoint
ALTER TABLE `registrations` ADD `registration_type` text DEFAULT 'MANUAL' NOT NULL;