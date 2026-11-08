CREATE TABLE `ticket_members` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`position` text NOT NULL,
	`last_seen` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `ticket_rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_members_token` ON `ticket_members` (`token_hash`);--> statement-breakpoint
CREATE INDEX `ticket_members_room` ON `ticket_members` (`room_code`,`last_seen`);--> statement-breakpoint
CREATE TABLE `ticket_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`delivered` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
