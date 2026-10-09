CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`superset_group` integer,
	`rest_seconds` integer NOT NULL,
	`rest_after_superset_seconds` integer,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`set_type` text NOT NULL,
	`weight_mode` text NOT NULL,
	`target_type` text,
	`target_reps` integer,
	`target_reps_min` integer,
	`target_reps_max` integer,
	`target_duration_sec` integer,
	`target_distance_m` integer,
	`target_weight_kg` real,
	`target_rir` integer,
	`target_rpe` real,
	`tempo` text,
	`reps` integer,
	`weight_kg` real,
	`duration_sec` integer,
	`distance_m` integer,
	`rir` integer,
	`rpe` real,
	`completed` integer NOT NULL,
	`completed_at` text,
	`failed` integer NOT NULL,
	`is_pr` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_sets_exercise` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text,
	`plan_day_id` text,
	`name` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`duration_sec` integer,
	`notes` text,
	`perceived_effort` integer,
	`bodyweight_kg` real,
	`calories_est` integer,
	`total_volume_kg` real NOT NULL,
	`visibility` text NOT NULL,
	`status` text NOT NULL,
	`client_updated_at` text NOT NULL,
	`revision` integer NOT NULL,
	`photo_path` text,
	`photo_uri` text,
	`runtime` text,
	`pushed_at` integer,
	`pending_edit` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workouts_started` ON `workouts` (`started_at`);--> statement-breakpoint
CREATE INDEX `workouts_status` ON `workouts` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_one_active` ON `workouts` (`status`) WHERE "workouts"."status" = 'in_progress';