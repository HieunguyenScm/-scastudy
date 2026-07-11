CREATE TABLE `ai_daily_usage` (
	`user_email` text NOT NULL,
	`usage_date` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_email`, `usage_date`),
	CONSTRAINT "ai_daily_usage_count_check" CHECK("ai_daily_usage"."request_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ai_daily_usage_date_idx` ON `ai_daily_usage` (`usage_date`);--> statement-breakpoint
CREATE TABLE `ai_executions` (
	`request_id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`week` integer,
	`status` text NOT NULL,
	`error_code` text,
	`model` text,
	`provider_status` integer,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`input_chars` integer NOT NULL,
	`output_chars` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ai_executions_week_check" CHECK("ai_executions"."week" IS NULL OR "ai_executions"."week" BETWEEN 1 AND 24),
	CONSTRAINT "ai_executions_attempt_count_check" CHECK("ai_executions"."attempt_count" BETWEEN 0 AND 2),
	CONSTRAINT "ai_executions_latency_check" CHECK("ai_executions"."latency_ms" >= 0),
	CONSTRAINT "ai_executions_input_chars_check" CHECK("ai_executions"."input_chars" >= 0),
	CONSTRAINT "ai_executions_output_chars_check" CHECK("ai_executions"."output_chars" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ai_executions_user_created_idx` ON `ai_executions` (`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_executions_status_created_idx` ON `ai_executions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `case_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`user_email` text NOT NULL,
	`revision` integer NOT NULL,
	`title` text NOT NULL,
	`stage` text NOT NULL,
	`problem` text NOT NULL,
	`hypothesis` text NOT NULL,
	`evidence` text NOT NULL,
	`recommendation` text NOT NULL,
	`assignment_module` integer,
	`rubric_scores` text NOT NULL,
	`reflection` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `case_studies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "case_revisions_revision_check" CHECK("case_revisions"."revision" >= 1),
	CONSTRAINT "case_revisions_rubric_scores_json_check" CHECK(json_valid("case_revisions"."rubric_scores"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_revisions_case_revision_uidx` ON `case_revisions` (`case_id`,`revision`);--> statement-breakpoint
CREATE INDEX `case_revisions_user_created_idx` ON `case_revisions` (`user_email`,`created_at`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`module` integer NOT NULL,
	`answers` text NOT NULL,
	`score` integer NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "quiz_attempts_module_check" CHECK("quiz_attempts"."module" BETWEEN 1 AND 6),
	CONSTRAINT "quiz_attempts_answers_json_check" CHECK(json_valid("quiz_attempts"."answers")),
	CONSTRAINT "quiz_attempts_score_check" CHECK("quiz_attempts"."score" BETWEEN 0 AND 100),
	CONSTRAINT "quiz_attempts_correct_check" CHECK("quiz_attempts"."correct" BETWEEN 0 AND "quiz_attempts"."total"),
	CONSTRAINT "quiz_attempts_total_check" CHECK("quiz_attempts"."total" > 0)
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_module_created_idx` ON `quiz_attempts` (`user_email`,`module`,`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_case_studies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`title` text NOT NULL,
	`stage` text DEFAULT 'Framing' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`hypothesis` text DEFAULT '' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`recommendation` text DEFAULT '' NOT NULL,
	`assignment_module` integer,
	`rubric_scores` text DEFAULT '{}' NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "case_studies_title_length_check" CHECK(length("title") BETWEEN 1 AND 160),
	CONSTRAINT "case_studies_stage_check" CHECK("stage" IN ('Framing', 'Analysis', 'Modelling', 'Recommendation', 'Portfolio-ready')),
	CONSTRAINT "case_studies_problem_length_check" CHECK(length("problem") <= 5000),
	CONSTRAINT "case_studies_hypothesis_length_check" CHECK(length("hypothesis") <= 5000),
	CONSTRAINT "case_studies_evidence_length_check" CHECK(length("evidence") <= 8000),
	CONSTRAINT "case_studies_recommendation_length_check" CHECK(length("recommendation") <= 5000),
	CONSTRAINT "case_studies_assignment_module_check" CHECK("assignment_module" IS NULL OR "assignment_module" BETWEEN 1 AND 6),
	CONSTRAINT "case_studies_rubric_scores_json_check" CHECK(json_valid("rubric_scores")),
	CONSTRAINT "case_studies_reflection_length_check" CHECK(length("reflection") <= 5000),
	CONSTRAINT "case_studies_revision_check" CHECK("revision" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_case_studies`("id", "user_email", "title", "stage", "problem", "hypothesis", "evidence", "recommendation", "assignment_module", "rubric_scores", "reflection", "revision", "deleted_at", "updated_at")
SELECT
	"id",
	"user_email",
	CASE WHEN length(trim("title")) = 0 THEN 'Untitled case' ELSE substr(trim("title"), 1, 160) END,
	CASE WHEN "stage" IN ('Framing', 'Analysis', 'Modelling', 'Recommendation', 'Portfolio-ready') THEN "stage" ELSE 'Framing' END,
	substr("problem", 1, 5000),
	substr("hypothesis", 1, 5000),
	substr("evidence", 1, 8000),
	substr("recommendation", 1, 5000),
	NULL,
	'{}',
	'',
	1,
	NULL,
	"updated_at"
FROM `case_studies`;--> statement-breakpoint
DROP TABLE `case_studies`;--> statement-breakpoint
ALTER TABLE `__new_case_studies` RENAME TO `case_studies`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `case_studies_user_active_updated_idx` ON `case_studies` (`user_email`,`deleted_at`,`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_progress` (
	`user_email` text NOT NULL,
	`week` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`quiz_score` integer,
	`practice_mask` integer DEFAULT 0 NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`mastery_status` text DEFAULT 'not-started' NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`last_reviewed_at` text,
	`next_review_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_email`, `week`),
	CONSTRAINT "progress_week_check" CHECK("week" BETWEEN 1 AND 24),
	CONSTRAINT "progress_confidence_check" CHECK("confidence" BETWEEN 0 AND 5),
	CONSTRAINT "progress_quiz_score_check" CHECK("quiz_score" IS NULL OR "quiz_score" BETWEEN 0 AND 100),
	CONSTRAINT "progress_practice_mask_check" CHECK("practice_mask" BETWEEN 0 AND 7),
	CONSTRAINT "progress_reflection_length_check" CHECK(length("reflection") <= 2000),
	CONSTRAINT "progress_mastery_status_check" CHECK("mastery_status" IN ('not-started', 'in-progress', 'completed', 'mastered')),
	CONSTRAINT "progress_review_count_check" CHECK("review_count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_progress`("user_email", "week", "completed", "confidence", "quiz_score", "practice_mask", "reflection", "mastery_status", "review_count", "last_reviewed_at", "next_review_at", "updated_at")
SELECT
	"user_email",
	"week",
	0,
	CASE WHEN "confidence" < 0 THEN 0 WHEN "confidence" > 5 THEN 5 ELSE "confidence" END,
	CASE WHEN "quiz_score" IS NULL THEN NULL WHEN "quiz_score" < 0 THEN 0 WHEN "quiz_score" > 100 THEN 100 ELSE "quiz_score" END,
	0,
	'',
	CASE WHEN "completed" <> 0 OR "confidence" > 0 OR "quiz_score" IS NOT NULL THEN 'in-progress' ELSE 'not-started' END,
	0,
	NULL,
	NULL,
	"updated_at"
FROM `progress`;--> statement-breakpoint
DROP TABLE `progress`;--> statement-breakpoint
ALTER TABLE `__new_progress` RENAME TO `progress`;--> statement-breakpoint
CREATE INDEX `progress_user_mastery_idx` ON `progress` (`user_email`,`mastery_status`);--> statement-breakpoint
CREATE INDEX `progress_user_next_review_idx` ON `progress` (`user_email`,`next_review_at`);--> statement-breakpoint
CREATE TRIGGER `case_studies_snapshot_after_insert`
AFTER INSERT ON `case_studies`
BEGIN
	INSERT INTO `case_revisions` (
		`case_id`, `user_email`, `revision`, `title`, `stage`, `problem`, `hypothesis`,
		`evidence`, `recommendation`, `assignment_module`, `rubric_scores`, `reflection`
	) VALUES (
		NEW.`id`, NEW.`user_email`, NEW.`revision`, NEW.`title`, NEW.`stage`, NEW.`problem`, NEW.`hypothesis`,
		NEW.`evidence`, NEW.`recommendation`, NEW.`assignment_module`, NEW.`rubric_scores`, NEW.`reflection`
	);
END;--> statement-breakpoint
CREATE TRIGGER `case_studies_snapshot_after_revision`
AFTER UPDATE ON `case_studies`
WHEN NEW.`revision` > OLD.`revision`
BEGIN
	INSERT INTO `case_revisions` (
		`case_id`, `user_email`, `revision`, `title`, `stage`, `problem`, `hypothesis`,
		`evidence`, `recommendation`, `assignment_module`, `rubric_scores`, `reflection`
	) VALUES (
		NEW.`id`, NEW.`user_email`, NEW.`revision`, NEW.`title`, NEW.`stage`, NEW.`problem`, NEW.`hypothesis`,
		NEW.`evidence`, NEW.`recommendation`, NEW.`assignment_module`, NEW.`rubric_scores`, NEW.`reflection`
	);
END;--> statement-breakpoint
CREATE TRIGGER `case_revisions_prevent_update`
BEFORE UPDATE ON `case_revisions`
BEGIN
	SELECT RAISE(ABORT, 'case revisions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `case_revisions_prevent_delete`
BEFORE DELETE ON `case_revisions`
BEGIN
	SELECT RAISE(ABORT, 'case revisions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `quiz_attempts_prevent_update`
BEFORE UPDATE ON `quiz_attempts`
BEGIN
	SELECT RAISE(ABORT, 'quiz attempts are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `quiz_attempts_prevent_delete`
BEFORE DELETE ON `quiz_attempts`
BEGIN
	SELECT RAISE(ABORT, 'quiz attempts are immutable');
END;
