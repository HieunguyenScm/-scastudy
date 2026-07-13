CREATE TABLE IF NOT EXISTS `lab_attempts` (
	`user_email` text NOT NULL,
	`week` integer NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`results` text DEFAULT '[]' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`passed` integer DEFAULT 0 NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_email`, `week`),
	CONSTRAINT "lab_attempts_week_check" CHECK(`week` BETWEEN 1 AND 24),
	CONSTRAINT "lab_attempts_answers_json_check" CHECK(json_valid(`answers`)),
	CONSTRAINT "lab_attempts_results_json_check" CHECK(json_valid(`results`)),
	CONSTRAINT "lab_attempts_score_check" CHECK(`score` BETWEEN 0 AND 100),
	CONSTRAINT "lab_attempts_attempt_count_check" CHECK(`attempt_count` >= 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lab_attempts_user_passed_idx` ON `lab_attempts` (`user_email`,`passed`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lab_attempt_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`week` integer NOT NULL,
	`answers` text NOT NULL,
	`results` text NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "lab_attempt_history_week_check" CHECK(`week` BETWEEN 1 AND 24),
	CONSTRAINT "lab_attempt_history_answers_json_check" CHECK(json_valid(`answers`)),
	CONSTRAINT "lab_attempt_history_results_json_check" CHECK(json_valid(`results`)),
	CONSTRAINT "lab_attempt_history_score_check" CHECK(`score` BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lab_attempt_history_user_week_created_idx` ON `lab_attempt_history` (`user_email`,`week`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `course_settings` (
	`user_email` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`weekly_hours` integer DEFAULT 6 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_settings_start_date_check" CHECK(length(`start_date`) = 10),
	CONSTRAINT "course_settings_weekly_hours_check" CHECK(`weekly_hours` BETWEEN 1 AND 40)
);
