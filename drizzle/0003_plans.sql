CREATE TABLE `plan_days` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`week` integer NOT NULL,
	`date` text NOT NULL,
	`original_date` text NOT NULL,
	`template_key` text NOT NULL,
	`label` text NOT NULL,
	`routine_id` text,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plan_days_plan` ON `plan_days` (`plan_id`,`date`);--> statement-breakpoint
CREATE TABLE `plan_weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`week` integer NOT NULL,
	`starts_on` text NOT NULL,
	`deload` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plan_weeks_plan` ON `plan_weeks` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal` text NOT NULL,
	`settings` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text NOT NULL,
	`paused_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plans_status` ON `plans` (`status`);