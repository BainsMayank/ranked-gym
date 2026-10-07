CREATE TABLE `exercise_muscles` (
	`exercise_id` text NOT NULL,
	`muscle` text NOT NULL,
	`role` text NOT NULL,
	`weight` real NOT NULL,
	PRIMARY KEY(`exercise_id`, `muscle`)
);
--> statement-breakpoint
CREATE TABLE `exercise_usage` (
	`exercise_id` text PRIMARY KEY NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text NOT NULL,
	`category` text NOT NULL,
	`equipment` text NOT NULL,
	`mechanic` text NOT NULL,
	`log_type` text NOT NULL,
	`unilateral` integer NOT NULL,
	`instructions` text NOT NULL,
	`tips` text NOT NULL,
	`common_mistakes` text NOT NULL,
	`media_url` text,
	`met_value` real NOT NULL,
	`is_rankable` integer NOT NULL,
	`rank_key` text,
	`created_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_created_by` ON `exercises` (`created_by`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
