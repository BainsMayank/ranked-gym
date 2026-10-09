CREATE TABLE `routine_drafts` (
	`routine_id` text PRIMARY KEY NOT NULL,
	`doc` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`superset_group` integer,
	`rest_seconds` integer NOT NULL,
	`rest_after_superset_seconds` integer,
	`notes` text,
	`progression_rule` text
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_routine` ON `routine_exercises` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`set_type` text NOT NULL,
	`target_type` text NOT NULL,
	`reps` integer,
	`reps_min` integer,
	`reps_max` integer,
	`duration_sec` integer,
	`distance_m` integer,
	`weight_kg` real,
	`weight_mode` text NOT NULL,
	`weight_percent` real,
	`rir` integer,
	`rpe` real,
	`tempo` text
);
--> statement-breakpoint
CREATE INDEX `routine_sets_exercise` ON `routine_sets` (`routine_exercise_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text,
	`name` text NOT NULL,
	`description` text,
	`colour` text,
	`estimated_duration_min` integer NOT NULL,
	`source` text NOT NULL,
	`source_ref` text,
	`sort_order` integer NOT NULL,
	`archived` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routines_folder` ON `routines` (`folder_id`);--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	PRIMARY KEY(`entity`, `entity_id`)
);
