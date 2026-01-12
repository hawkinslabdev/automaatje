CREATE TABLE `gps_points` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` real NOT NULL,
	`altitude` real,
	`speed` real,
	`heading` real,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `live_trips`(`id`) ON UPDATE no action ON DELETE cascade
);
