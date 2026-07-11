CREATE TABLE IF NOT EXISTS `retrieval_attempts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_email` text NOT NULL,
  `week` integer NOT NULL,
  `prompt_id` text NOT NULL,
  `item_type` text NOT NULL,
  `response` text NOT NULL,
  `confidence` integer NOT NULL,
  `assisted` integer NOT NULL DEFAULT 0,
  `score` integer NOT NULL,
  `passed` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `retrieval_attempts_week_check` CHECK (`week` BETWEEN 1 AND 24),
  CONSTRAINT `retrieval_attempts_type_check` CHECK (`item_type` IN ('recall','application','transfer')),
  CONSTRAINT `retrieval_attempts_confidence_check` CHECK (`confidence` BETWEEN 1 AND 5),
  CONSTRAINT `retrieval_attempts_score_check` CHECK (`score` BETWEEN 0 AND 100),
  CONSTRAINT `retrieval_attempts_response_length_check` CHECK (length(`response`) BETWEEN 40 AND 5000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `retrieval_attempts_user_week_created_idx` ON `retrieval_attempts` (`user_email`,`week`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lesson_block_progress` (
  `user_email` text NOT NULL,
  `week` integer NOT NULL,
  `block_id` text NOT NULL,
  `completed` integer NOT NULL DEFAULT 0,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_email`, `week`, `block_id`),
  CONSTRAINT `lesson_block_progress_week_check` CHECK (`week` BETWEEN 1 AND 24),
  CONSTRAINT `lesson_block_progress_block_id_check` CHECK (length(`block_id`) BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lesson_block_progress_user_week_idx` ON `lesson_block_progress` (`user_email`,`week`);
